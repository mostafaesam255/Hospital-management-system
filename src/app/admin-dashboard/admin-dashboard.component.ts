import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user/user.service';
import { User } from '../user/user.model';
import { ClinicService } from '../clinics/clinic.service';
import { PatientService } from '../patient/patient.service';
import { Patient } from '../patient/patient.model';
import { Clinic } from '../clinics/clinic.model';
import { AIService } from '../shared/ai.service'; // ✅ جديد

declare var bootstrap: any;

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class AdminDashboardComponent implements OnInit {
  public userService = inject(UserService);
  public clinicService = inject(ClinicService);
  public patientService = inject(PatientService);
  public aiService = inject(AIService); // ✅ جديد
  private formBuilder = inject(FormBuilder);

  public totalUsers = computed(() => this.userService.users().length);
  public userForm = this.formBuilder.group({
    id: [''],
    name: ['', Validators.required],
    username: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@gmail\\.com$')]],
    password: ['', [Validators.required, Validators.pattern('^(?=.*[A-Z])(?=.*[@#*$!%?&]).{6,}$')]],
    role: ['doctor', Validators.required],
    clinicId: [''],
  });

  public clinicForm = this.formBuilder.group({
    id: [''],
    name: ['', Validators.required],
    description: ['', Validators.required]
  });

  public patients = this.patientService.patients;
  public editUser = signal<User | null>(null);
  public selectedUser = signal<User | null>(null);
  public selectedPatient = signal<Patient | null>(null);
  public editClinic = signal<Clinic | null>(null);
  public selectedClinic = signal<Clinic | null>(null);
  public clinics = this.clinicService.clinics;

  ngOnInit(): void {
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      const clinicIdControl = this.userForm.get('clinicId');
      if (role === 'doctor' || role === 'nurse') {
        clinicIdControl?.setValidators([Validators.required]);
        // ✅ اختيار أول عيادة تلقائياً لو مفيش قيمة محددة
        if (!clinicIdControl?.value) {
          const firstClinic = this.clinicService.clinics()[0];
          if (firstClinic) {
            clinicIdControl?.setValue(firstClinic.id);
          }
        }
      } else {
        clinicIdControl?.clearValidators();
        clinicIdControl?.setValue('');
      }
      clinicIdControl?.updateValueAndValidity();
    });
  }

  resetPasswordValidators(): void {
    this.userForm.get('password')?.setValidators([
      Validators.required,
      Validators.pattern('^(?=.*[A-Z])(?=.*[@#*$!%?&]).{6,}$')
    ]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  getClinicName(clinicId?: string): string {
    if (!clinicId) return 'General / Admin';
    const clinic = this.clinics().find(c => c.id === clinicId);
    return clinic ? clinic.name : 'Unknown';
  }

  // ✅ جديد - توليد التقرير الذكي
  async onGenerateReport(): Promise<void> {
    const patients = this.patientService.patients();

    const allDiagnoses: string[] = [];
    const allMedicines: string[] = [];
    let totalConsultations = 0;

    patients.forEach(patient => {
      patient.medicalHistory?.forEach(history => {
        if (history.diagnosis) {
          allDiagnoses.push(history.diagnosis);
          totalConsultations++;
        }
        history.prescription?.forEach(med => {
          allMedicines.push(med.medicineName);
        });
      });
    });

    await this.aiService.generateAnalyticsReport({
      totalPatients: patients.length,
      totalConsultations,
      totalStaff: this.userService.users().length,
      totalClinics: this.clinicService.clinics().length,
      diagnoses: allDiagnoses,
      medicines: allMedicines
    });
  }

  // Patient Methods
  openPatientModal(patient: Patient): void {
    this.selectedPatient.set(patient);
    const modal = new bootstrap.Modal(document.getElementById('patientDetailsModal'));
    modal.show();
  }

  // User Methods
  onDeleteUser(user: User): void {
    this.selectedUser.set(user);
  }

  confirmDeleteUser(): void {
    if (this.selectedUser()) {
      this.userService.deleteUser(this.selectedUser()!.id);
    }
  }

  onAddUser(): void {
    if (this.userForm.invalid) return;
    this.userService.addUser(this.userForm.getRawValue() as Omit<User, 'id'>);
    this.userForm.reset({ role: 'doctor' });
    const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
    modal.hide();
  }

  onEditUser(user: User): void {
    this.editUser.set(user);
    const { password, ...userData } = user;
    this.userForm.patchValue(userData);
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.reset('');
  }

  onUpdateUser(): void {
    if (!this.userForm.valid || !this.editUser()) return;
    const formValues = this.userForm.getRawValue();
    const updatedUser: User = {
      ...this.editUser()!,
      ...formValues
    } as User;
    if (!formValues.password) {
      delete (updatedUser as Partial<User>).password;
    }
    this.userService.updateUser(updatedUser);
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    modal.hide();
  }

  // Clinic Methods
  onAddClinic(): void {
    if (this.clinicForm.invalid) return;
    this.clinicService.addClinic(this.clinicForm.getRawValue() as Omit<Clinic, 'id'>);
    this.clinicForm.reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('addClinicModal'));
    modal.hide();
  }

  onEditClinic(clinic: Clinic): void {
    this.editClinic.set(clinic);
    this.clinicForm.patchValue(clinic);
  }

  onUpdateClinic(): void {
    if (this.clinicForm.invalid || !this.editClinic()) return;
    const updatedClinic: Clinic = {
      ...this.editClinic()!,
      ...this.clinicForm.getRawValue()
    } as Clinic;
    this.clinicService.updateClinic(updatedClinic);
    const modalElement = document.getElementById('editClinicModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  onDeleteClinic(clinic: Clinic): void {
    this.selectedClinic.set(clinic);
  }

  confirmDeleteClinic(): void {
    if (this.selectedClinic()) {
      this.clinicService.deleteClinic(this.selectedClinic()!.id);
    }
  }
}