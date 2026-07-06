import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../patient/patient.service';
import { Patient } from '../patient/patient.model';
import { ClinicService } from '../clinics/clinic.service';
import { AuthService } from '../auth/auth.service';
import { AIService } from '../shared/ai.service';

declare var bootstrap: any;

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class NurseDashboardComponent {
  public patientService = inject(PatientService);
  public clinicService = inject(ClinicService);
  public authService = inject(AuthService);
  public aiService = inject(AIService);
  private formBuilder = inject(FormBuilder);

  private currentUser = this.authService.currentUser;

  public patients = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'nurse') {
      return this.patientService.patients().filter(p => 
        p.status === 'Pending' && 
        (user.clinicId != null && String(p.clinicId) === String(user.clinicId))
      );
    }
    return [];
  });

  public vitalsCompletedCount = computed(() => {
    const user = this.currentUser();
    if (user?.role === 'nurse') {
      return this.patientService.patients().filter(p => p.status !== 'Pending').length;
    }
    return 0;
  });

  public currentPatient = signal<Patient | null>(null);

  public vitalsForm = this.formBuilder.group({
    height: ['', Validators.required],
    weight: ['', Validators.required],
    bloodPressure: ['', Validators.required],
    temperature: ['', Validators.required],
    pulse: ['', Validators.required],
    oxygenSaturation: ['', Validators.required],
  });

  getClinicName(clinicId: string): string {
    const clinic = this.clinicService.clinics().find(c => c.id === clinicId);
    return clinic ? clinic.name : 'Unknown';
  }

  onTakeVitals(patient: Patient): void {
    this.currentPatient.set(patient);
    this.vitalsForm.reset();
    this.vitalsForm.patchValue(patient.vitals as any);
    this.aiService.vitalsAnalysis.set(null); 
  }

  async onAnalyzeVitals(): Promise<void> {
    const v = this.vitalsForm.getRawValue();
    if (this.vitalsForm.invalid) return;
    await this.aiService.analyzeVitals({
      height: +v.height!,
      weight: +v.weight!,
      bloodPressure: v.bloodPressure!,
      temperature: +v.temperature!,
      pulse: +v.pulse!,
      oxygenSaturation: +v.oxygenSaturation!
    });
  }

  async onSaveVitals(): Promise<void> {
    if (this.vitalsForm.invalid || !this.currentPatient()) return;

    const patient = this.currentPatient()!;
    const v = this.vitalsForm.getRawValue();

    const readyPatientsKey = 'hms_ready_patients';
    const existing = JSON.parse(localStorage.getItem(readyPatientsKey) || '[]') as string[];
    if (!existing.includes(patient.id)) {
      existing.push(patient.id);
      localStorage.setItem(readyPatientsKey, JSON.stringify(existing));
    }
    const vitalsKey = 'hms_patient_vitals';
    const existingVitals = JSON.parse(localStorage.getItem(vitalsKey) || '{}') as Record<string, any>;
    existingVitals[patient.id] = {
      height: parseFloat(v.height!),
      weight: parseFloat(v.weight!),
      bloodPressure: v.bloodPressure!,
      temperature: parseFloat(v.temperature!),
      pulse: parseInt(v.pulse!),
      oxygenSaturation: parseFloat(v.oxygenSaturation!)
    };
    localStorage.setItem(vitalsKey, JSON.stringify(existingVitals));
    console.log('✅ Vitals saved to localStorage for patient:', patient.name);

    this.patientService.updatePatientVitals(patient.id, v as any);

    const modalElement = document.getElementById('vitalsModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
    this.currentPatient.set(null);
    this.aiService.vitalsAnalysis.set(null);
    console.log('✅ Patient marked as Ready:', patient.name);
  }
}