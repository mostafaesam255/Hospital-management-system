import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../patient/patient.service';
import { Patient } from '../patient/patient.model';
import { ClinicService } from '../clinics/clinic.service';
import { UserService } from '../user/user.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-patient-lookup',
  templateUrl: './patient-lookup.component.html',
  styleUrls: ['./patient-lookup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class PatientLookupComponent {
  private patientService = inject(PatientService);
  private http = inject(HttpClient);
  public clinicService = inject(ClinicService);
  public userService = inject(UserService);

  private apiUrl = environment.apiUrl;

  public nationalId = signal('');
  public searchPerformed = signal(false);
  public isSearching = signal(false);
  public patient = signal<Patient | null>(null);
  public errorMessage = signal<string | null>(null);

  public sortedMedicalHistory = computed(() => {
    const p = this.patient();
    if (!p || !p.medicalHistory) return [];
    return [...p.medicalHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  async search(): Promise<void> {
    const id = this.nationalId().trim();
    if (!id) return;

    this.searchPerformed.set(true);
    this.isSearching.set(true);
    this.errorMessage.set(null);
    this.patient.set(null);

    try {
      // ✅ استخدام الـ endpoint المخصص للبحث بالرقم القومي مباشرة
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/Receptionist/GetByNationalId/${encodeURIComponent(id)}`)
      );

      let foundPatient: Patient | null = null;

      if (response?.data) {
        const raw = response.data;
        const pid = raw.id.toLowerCase();

        // ✅ إثراء البيانات من localStorage
        const savedVitals = JSON.parse(localStorage.getItem('hms_patient_vitals') || '{}');
        const savedHistory = JSON.parse(localStorage.getItem('hms_patient_history') || '{}');
        const savedInvestigations = JSON.parse(localStorage.getItem('hms_patient_investigations') || '{}');

        // ✅ جلب التحاليل من الباكيند مباشرة للمريض المبحوث عنه
        let serverInvestigations: any[] = [];
        try {
          const invResponse = await firstValueFrom(
            this.http.get<any>(`${this.apiUrl}/InvestigationRequest`)
          );
          if (invResponse?.data) {
            serverInvestigations = invResponse.data
              .filter((inv: any) => String(inv.patientId).toLowerCase() === pid)
              .map((inv: any) => ({
                id: inv.id,
                type: inv.type,
                name: inv.name,
                price: inv.price,
                date: inv.date,
                requestedBy: inv.doctorId,
                status: inv.status,
                result: inv.result,
                report: inv.report,
                attachment: inv.attachment,
                paid: inv.paid
              }));
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch investigations from backend for lookup:', err);
        }

        const vitals = raw.vitals || savedVitals[pid] || null;
        const medicalHistory = (raw.medicalHistory?.length > 0)
          ? raw.medicalHistory
          : (savedHistory[pid] || []);
        const investigations = (() => {
          const local = savedInvestigations[pid] || [];
          const serverIds = new Set(serverInvestigations.map((i: any) => i.id));
          return [...serverInvestigations, ...local.filter((i: any) => !serverIds.has(i.id))];
        })();

        foundPatient = {
          id: raw.id,
          name: raw.fullName || '',
          nationalId: raw.nationalId,
          dateOfBirth: raw.dateOfBirth || '',
          gender: (raw.gender === 0 ? 'male' : 'female') as 'male' | 'female',
          contact: raw.phone || '',
          address: raw.address || '',
          clinicId: raw.clinicId,
          status: raw.status || 'Pending',
          vitals,
          medicalHistory,
          investigations,
          isBilled: raw.isBilled || false
        } as Patient;
      }

      this.patient.set(foundPatient);
      if (!foundPatient) {
        this.errorMessage.set('No patient found with the provided National ID.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      // Fallback: ابحث في القائمة المحلية
      const local = this.patientService.findPatientByNationalId(id);
      this.patient.set(local || null);
      if (!local) {
        this.errorMessage.set('No patient found with the provided National ID.');
      }
    } finally {
      this.isSearching.set(false);
    }
  }

  onNationalIdInput(event: Event): void {
    this.nationalId.set((event.target as HTMLInputElement).value);
  }

  openAttachment(url: string): void {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<img src="${url}" style="max-width: 100%;">`);
    }
  }

  getClinicName(clinicId: string): string {
    const clinic = this.clinicService.clinics().find(c => String(c.id) === String(clinicId));
    return clinic ? clinic.name : 'Unknown';
  }

  getDoctorName(doctorId: string): string {
    const doctor = this.userService.users().find(u => String(u.id) === String(doctorId));
    return doctor ? doctor.name : 'Unknown';
  }

  getInvestigationsForVisit(visitDate: string, doctorId: string): any[] {
    const p = this.patient();
    if (!p || !p.investigations) return [];
    
    const visitTime = new Date(visitDate).getTime();
    return p.investigations.filter(inv => 
      String(inv.requestedBy).toLowerCase() === String(doctorId).toLowerCase() &&
      Math.abs(new Date(inv.date).getTime() - visitTime) < 15 * 60 * 1000
    );
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'bg-secondary text-white';
    switch (status) {
      case 'Requested':
        return 'bg-warning text-dark';
      case 'In Progress':
        return 'bg-info text-dark';
      case 'Results Ready':
        return 'bg-success text-white';
      case 'Completed':
        return 'bg-primary text-white';
      default:
        return 'bg-secondary text-white';
    }
  }
}
