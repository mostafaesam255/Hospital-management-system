import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Clinic } from './clinic.model';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ClinicService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/Clinic`;

  // ✅ الـ Default Medical Specialty ID من الـ Database
  private defaultSpecialtyId = '83AC97B4-CEB6-4FAC-9BFE-0343C6ABE04A';

  public clinics = signal<Clinic[]>([]);
  public isLoading = signal(false);

  private pollingIntervalId: any = null;

  constructor() {
    this.loadClinics();
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingIntervalId) return;
    this.pollingIntervalId = setInterval(async () => {
      if (this.authService.currentUser() && !this.isLoading()) {
        await this.loadClinics(true);
      }
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ✅ جيب كل الـ Clinics من الـ Backend (معدل للعمل محلياً)
  async loadClinics(silent: boolean = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    try {
      let clinicsList: Clinic[] = [];
      const storedClinics = localStorage.getItem('hms_clinics');
      if (!storedClinics) {
        const defaultClinics = [
          { id: 'c1', name: 'Neurology Clinic', description: 'Brain and nervous system diagnostic clinic.' },
          { id: 'c2', name: 'Cardiology Clinic', description: 'Heart and cardiovascular clinic.' },
          { id: 'c3', name: 'Pediatrics Clinic', description: 'Child care and treatment clinic.' },
          { id: 'c4', name: 'Orthopedics Clinic', description: 'Bone and muscle clinic.' }
        ];
        localStorage.setItem('hms_clinics', JSON.stringify(defaultClinics));
        clinicsList = defaultClinics;
      } else {
        clinicsList = JSON.parse(storedClinics);
      }

      const currentData = JSON.stringify(this.clinics());
      const newData = JSON.stringify(clinicsList);
      if (currentData !== newData) {
        this.clinics.set(clinicsList);
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      if (!silent) this.isLoading.set(false);
    }
  }

  // ✅ أضف Clinic جديدة - معدل محلياً
  async addClinic(clinic: Omit<Clinic, 'id'>): Promise<void> {
    try {
      const storedClinics = localStorage.getItem('hms_clinics');
      const clinicsList: Clinic[] = storedClinics ? JSON.parse(storedClinics) : [];

      const newClinic: Clinic = {
        id: 'c_' + Math.random().toString(36).substring(2, 9),
        name: clinic.name,
        description: clinic.description || ''
      };

      clinicsList.push(newClinic);
      localStorage.setItem('hms_clinics', JSON.stringify(clinicsList));

      await this.loadClinics();
    } catch (error) {
      console.error('Error adding clinic:', error);
    }
  }

  // ✅ عدّل Clinic - معدل محلياً
  async updateClinic(updatedClinic: Clinic): Promise<void> {
    try {
      const storedClinics = localStorage.getItem('hms_clinics');
      let clinicsList: Clinic[] = storedClinics ? JSON.parse(storedClinics) : [];

      clinicsList = clinicsList.map(c => {
        if (String(c.id) === String(updatedClinic.id)) {
          return {
            ...c,
            name: updatedClinic.name,
            description: updatedClinic.description || ''
          };
        }
        return c;
      });

      localStorage.setItem('hms_clinics', JSON.stringify(clinicsList));

      await this.loadClinics();
    } catch (error) {
      console.error('Error updating clinic:', error);
    }
  }

  // ✅ احذف Clinic - معدل محلياً
  async deleteClinic(id: string): Promise<void> {
    try {
      const storedClinics = localStorage.getItem('hms_clinics');
      let clinicsList: Clinic[] = storedClinics ? JSON.parse(storedClinics) : [];

      clinicsList = clinicsList.filter(c => String(c.id) !== String(id));
      localStorage.setItem('hms_clinics', JSON.stringify(clinicsList));

      await this.loadClinics();
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
    }
  }

  // ✅ جيب اسم الـ Clinic - بنقارن كـ string لتجنب مشاكل الـ Type
  getClinicName(id: string | undefined | null): string {
    if (!id) return '—';
    const clinic = this.clinics().find(c => String(c.id).toLowerCase() === String(id).toLowerCase());
    return clinic ? clinic.name : '—';
  }
}