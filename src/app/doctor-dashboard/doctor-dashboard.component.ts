import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PatientService } from '../patient/patient.service';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { ClinicService } from '../clinics/clinic.service';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { Patient, Investigation, InvestigationType, InvestigationName, PrescriptionDetail, ServiceDetail } from '../patient/patient.model';
import { Medicine } from '../pharmacy/pharmacy.model';
import { User } from '../user/user.model';
import { AIService } from '../shared/ai.service';
import { environment } from '../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare var bootstrap: any;

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class DoctorDashboardComponent {
  public patientService = inject(PatientService);
  public authService = inject(AuthService);
  public userService = inject(UserService);
  public clinicService = inject(ClinicService);
  public pharmacyService = inject(PharmacyService);
  public aiService = inject(AIService);
  private http = inject(HttpClient);
  private formBuilder = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  public activeAiModel = signal<string | null>(null);
  public aiHubIframeUrl = signal<SafeResourceUrl | null>(null);

  public getAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 30;
    const dob = new Date(dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  public openAiModel(patient: Patient, modelKey: string): void {
    this.activeAiModel.set(modelKey);
    
    const age = this.getAge(patient.dateOfBirth);
    const gender = patient.gender ? patient.gender : 'Male';
    
    let heightM = 1.75;
    let weightKg = 70;
    let bmiVal = 22.8;
    
    if (patient.vitals) {
      if (patient.vitals.height) {
        heightM = patient.vitals.height / 100;
      }
      if (patient.vitals.weight) {
        weightKg = patient.vitals.weight;
      }
      if (patient.vitals.height && patient.vitals.weight) {
        bmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));
      }
    }
    
    const baseUrl = environment.aiHubUrl || 'http://localhost:8501';
    
    const queryParams = new URLSearchParams({
      model: modelKey,
      age: age.toString(),
      gender: gender,
      height: heightM.toString(),
      weight: weightKg.toString(),
      bmi: bmiVal.toString()
    });
    
    const rawUrl = `${baseUrl}/?${queryParams.toString()}`;
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    this.aiHubIframeUrl.set(safeUrl);
    
    const modalEl = document.getElementById('aiModelModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  public closeAiModel(): void {
    this.activeAiModel.set(null);
    this.aiHubIframeUrl.set(null);
  }

  public consultationForm = this.formBuilder.group({
    diagnosis: ['', Validators.required],
    prescriptionSearch: [''],
    dosage: [''],
    frequency: ['']
  });

  public servicesForm = this.formBuilder.group({
    serviceName: ['', Validators.required],
    servicePrice: [0, [Validators.required, Validators.min(0)]]
  });

  public requestInvestigationForm = this.formBuilder.group({
    cbc: [false],
    glucose: [false],
    liver: [false],
    xray: [false],
    ultrasound: [false],
    mri: [false]
  });

  async onAskAI(symptoms: string | null | undefined) {
    if (symptoms) {
      await this.aiService.analyzeAndPrescribe(symptoms);
    }
  }

  applyAIRecommendation(med: any) {
    const matchingMedicine = this.pharmacyService.medicines().find(
      m => m.name.toLowerCase() === med.medicineName.toLowerCase());
    
    if (matchingMedicine) {
      this.selectMedicine(matchingMedicine);
      this.consultationForm.patchValue({ dosage: med.dosage, frequency: med.frequency });
      this.addPrescribedMedicine();
    }
  }

  async onSaveConsultation(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (this.consultationForm.get('diagnosis')?.invalid || !this.selectedPatient() || !currentUser) {
      return;
    }

    const { diagnosis } = this.consultationForm.value;

    // Automatically add any pending medicine that was selected but not explicitly added
    if (this.selectedMedicine()) {
      this.addPrescribedMedicine();
    }

    // Automatically request any checked investigations
    await this.onRequestInvestigation();

    await this.patientService.addConsultation(
      this.selectedPatient()!.id,
      diagnosis!,
      this.prescribedMedicines(),
      currentUser.id,
      currentUser.clinicId!,
      this.requestedServices()
    );
    const modal = bootstrap.Modal.getInstance(document.getElementById('consultationModal'));
    modal.hide();
    this.selectedPatient.set(null);
    this.aiService.aiSuggestion.set(null);
  }

  public investigationKeys = Object.keys(this.requestInvestigationForm.controls) as (keyof typeof this.requestInvestigationForm.controls)[];
  public investigationNameMap: { [key: string]: string } = {
    cbc: 'CBC Lab',
    glucose: 'Glucose Lab',
    liver: 'Liver Function',
    xray: 'X-Ray',
    ultrasound: 'Ultrasound',
    mri: 'MRI'
  };

  public searchTerm = signal<string>('');
  public prescribedMedicines = signal<PrescriptionDetail[]>([]);
  public requestedServices = signal<ServiceDetail[]>([]);
  public showInvestigation = signal(false);
  public selectedAttachment = signal<string | null>(null);
  public selectedReportInvestigation = signal<Investigation | null>(null);
  public selectedMedicine = signal<Medicine | null>(null);
  public activeTab = signal<'new-consultation' | 'investigation-history' | 'medical-history'>('new-consultation');

  public filteredMedicines = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return [];
    }
    const prescribedIds = this.prescribedMedicines().map(p => p.medicineId);
    return this.pharmacyService.medicines().filter(
      medicine => 
        medicine.quantity > 0 && 
        medicine.name.toLowerCase().includes(term) &&
        !prescribedIds.includes(medicine.id)
    );
  });

  private clinicPatients = computed(() => {
    const currentUser = this.authService.currentUser();
    if (currentUser?.role !== 'doctor') return [];
    return this.patientService.patients().filter(p => 
      currentUser.clinicId != null && String(p.clinicId) === String(currentUser.clinicId)
    );
  });

  public patients = computed(() => {
    return this.clinicPatients().filter(p => p.status === 'Ready' || this.hasNewResults(p));
  });

  public pendingConsultationCount = computed(() => {
    return this.clinicPatients().filter(p => p.status === 'Ready').length;
  });

  public newResultsCount = computed(() => {
    return this.clinicPatients().filter(p => this.hasNewResults(p)).length;
  });
  
  public selectedPatient = signal<Patient | null>(null);

  public sortedMedicalHistory = computed(() => {
    const patient = this.selectedPatient();
    if (!patient || !patient.medicalHistory) {
      return [];
    }
    return [...patient.medicalHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  public sortedInvestigations = computed(() => {
    const patient = this.selectedPatient();
    if (!patient || !patient.investigations) {
      return [];
    }
    return [...patient.investigations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  constructor() {
    this.consultationForm.get('prescriptionSearch')?.valueChanges.subscribe(value => {
      this.searchTerm.set(value || '');
    });
  }

  closeConsultation(): void {
    this.selectedPatient.set(null);
    this.aiService.aiSuggestion.set(null);
    this.prescribedMedicines.set([]);
    this.requestedServices.set([]);
    this.showInvestigation.set(false);
    this.selectedMedicine.set(null);
  }

  setActiveTab(tab: 'new-consultation' | 'investigation-history' | 'medical-history'): void {
    this.activeTab.set(tab);
  }

  async openConsultationModal(patient: Patient): Promise<void> {
    // Clear previous patient data and AI suggestions synchronously to avoid stale UI while loading
    this.selectedPatient.set(null);
    this.aiService.aiSuggestion.set(null);
    this.prescribedMedicines.set([]);
    this.requestedServices.set([]);
    this.showInvestigation.set(false);
    this.selectedMedicine.set(null);
    this.consultationForm.reset({ diagnosis: '', prescriptionSearch: '', dosage: '', frequency: '' });
    this.servicesForm.reset({ serviceName: '', servicePrice: 0 });
    this.searchTerm.set('');

    const pid = patient.id.toLowerCase();

    const savedHistory: Record<string, any[]> = JSON.parse(localStorage.getItem('hms_patient_history') || '{}');
    const savedInvestigations: Record<string, any[]> = JSON.parse(localStorage.getItem('hms_patient_investigations') || '{}');
    const savedVitals: Record<string, any> = JSON.parse(localStorage.getItem('hms_patient_vitals') || '{}');

    let backendHistory: any[] = [];
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/Consultation/GetByPatientId/${patient.id}`)
      );
      if (response?.data?.length > 0) {
        backendHistory = response.data.map((c: any) => ({
          date: c.date,
          diagnosis: c.diagnosis,
          doctorId: c.doctorId,
          clinicId: c.clinicId,
          prescription: c.prescriptionJson ? JSON.parse(c.prescriptionJson) : [],
          requestedServices: c.servicesJson ? JSON.parse(c.servicesJson) : []
        }));
        const localHistory = savedHistory[pid] || [];
        const allHistory = [...backendHistory];
        localHistory.forEach((local: any) => {
          const exists = backendHistory.some((b: any) =>
            new Date(b.date).getTime() === new Date(local.date).getTime()
          );
          if (!exists) allHistory.push(local);
        });
        savedHistory[pid] = allHistory;
        localStorage.setItem('hms_patient_history', JSON.stringify(savedHistory));
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch history from backend, using localStorage:', err);
    }

    const finalHistory = savedHistory[pid] || backendHistory;

    const serverInvestigations = patient.investigations || [];
    const localInvestigations = savedInvestigations[pid] || [];
    const serverInvIds = new Set(serverInvestigations.map((i: any) => i.id));
    const mergedInvestigations = [
      ...serverInvestigations,
      ...localInvestigations.filter((i: any) => !serverInvIds.has(i.id))
    ];

    const enrichedPatient: Patient = {
      ...patient,
      vitals: patient.vitals || savedVitals[pid] || null,
      medicalHistory: finalHistory,
      investigations: mergedInvestigations
    };

    this.selectedPatient.set(enrichedPatient);
    this.aiService.aiSuggestion.set(null); // Clear previous AI recommendation
    this.consultationForm.reset({ diagnosis: '', prescriptionSearch: '', dosage: '', frequency: '' });
    this.servicesForm.reset({ serviceName: '', servicePrice: 0 });
    this.prescribedMedicines.set([]);
    this.requestedServices.set([]);
    this.showInvestigation.set(false);
    this.searchTerm.set('');
    this.selectedMedicine.set(null);
    this.activeTab.set('new-consultation');
    this.updateInvestigationFormStatus(enrichedPatient);
    this.pharmacyService.loadMedicines();
    const modal = new bootstrap.Modal(document.getElementById('consultationModal'));
    modal.show();
  }

  updateInvestigationFormStatus(patient: Patient): void {
    this.requestInvestigationForm.reset();
    const pendingInvestigations = (patient.investigations || [])
      .filter(inv => inv.status === 'Requested' || inv.status === 'In Progress')
      .map(inv => inv.name);

    const controls = this.requestInvestigationForm.controls;
    (Object.keys(controls) as Array<keyof typeof controls>).forEach(key => {
      const investigationName = this.mapFormKeyToInvestigationName(key);
      if (investigationName && pendingInvestigations.includes(investigationName)) {
        controls[key].setValue(true);
        controls[key].disable();
      } else {
        controls[key].enable();
      }
    });
  }

  async onRequestInvestigation(): Promise<void> {
    const currentUser = this.authService.currentUser();
    const patient = this.selectedPatient();
    if (!patient || !currentUser) return;

    const investigationValues = this.requestInvestigationForm.getRawValue();
    const controls = this.requestInvestigationForm.controls;

    const processRequest = async (controlName: keyof typeof controls, type: InvestigationType, name: InvestigationName, price: number) => {
      if (investigationValues[controlName] && controls[controlName].enabled) {
        await this.patientService.addInvestigationRequest(patient.id, type, name, currentUser.id, price);
      }
    };

    await processRequest('cbc', 'lab', 'CBC Lab', 150);
    await processRequest('glucose', 'lab', 'Glucose Lab', 50);
    await processRequest('liver', 'lab', 'Liver Function', 25);
    await processRequest('xray', 'scan', 'X-Ray', 50);
    await processRequest('ultrasound', 'scan', 'Ultrasound', 60);
    await processRequest('mri', 'scan', 'MRI', 1200);

    const updatedPatient = this.patientService.getPatientById(patient.id);
    if (updatedPatient) {
      this.updateInvestigationFormStatus(updatedPatient);
    }
  }

  selectMedicine(medicine: Medicine): void {
    this.selectedMedicine.set(medicine);
    this.consultationForm.get('prescriptionSearch')?.setValue('');
    this.searchTerm.set('');
  }

  addPrescribedMedicine(): void {
    const selectedMed = this.selectedMedicine();
    if (!selectedMed) {
      return;
    }
    
    let { dosage, frequency } = this.consultationForm.value;
    dosage = dosage?.trim() || 'As prescribed';
    frequency = frequency?.trim() || 'Once daily';

    const newPrescription: PrescriptionDetail = {
      medicineId: selectedMed.id,
      medicineName: selectedMed.name,
      price: selectedMed.price,
      dosage,
      frequency,
      paid: false
    };

    this.prescribedMedicines.update(medicines => [...medicines, newPrescription]);
    this.selectedMedicine.set(null);
    this.consultationForm.patchValue({ dosage: '', frequency: '' });
  }

  addService(): void {
    if (this.servicesForm.invalid) {
      return;
    }
    const { serviceName, servicePrice } = this.servicesForm.value;
    const newService: ServiceDetail = { name: serviceName!, price: servicePrice!, paid: false };
    this.requestedServices.update(services => [...services, newService]);
    this.servicesForm.reset({ serviceName: '', servicePrice: 0 });
  }

  removeMedicine(medicineId: string): void {
    this.prescribedMedicines.update(medicines => medicines.filter(m => m.medicineId !== medicineId));
  }

  removeService(serviceName: string): void {
    this.requestedServices.update(services => services.filter(s => s.name !== serviceName));
  }

  getClinicName(clinicId: string | undefined): string {
    if (!clinicId) return 'Unknown';
    const clinic = this.clinicService.clinics().find(c => String(c.id) === String(clinicId));
    return clinic ? clinic.name : 'Unknown';
  }
  
  getDoctorName(doctorId: string | undefined): string {
    if (!doctorId) return 'Unknown';
    const doctor = this.userService.users().find((u: User) => String(u.id) === String(doctorId));
    return doctor ? doctor.name : 'Unknown';
  }

  hasNewResults(patient: Patient): boolean {
    return patient.investigations.some(inv => inv.status === 'Results Ready');
  }

  viewAttachment(attachment: string): void {
    this.selectedAttachment.set(attachment);
    const modal = new bootstrap.Modal(document.getElementById('attachmentModal'));
    modal.show();
  }

  openReportModal(investigation: Investigation): void {
    this.selectedReportInvestigation.set(investigation);
    const modal = new bootstrap.Modal(document.getElementById('reportDetailModal'));
    modal.show();
  }

  private mapFormKeyToInvestigationName(key: string): InvestigationName | null {
    const map: { [key: string]: InvestigationName } = {
      cbc: 'CBC Lab',
      glucose: 'Glucose Lab',
      liver: 'Liver Function',
      xray: 'X-Ray',
      ultrasound: 'Ultrasound',
      mri: 'MRI'
    };
    return map[key] || null;
  }
}
