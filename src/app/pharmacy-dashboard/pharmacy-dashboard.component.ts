import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Medicine } from '../pharmacy/pharmacy.model';
import { PatientService } from '../patient/patient.service';
import { Patient, PrescriptionDetail } from '../patient/patient.model';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';
import { AIService } from '../shared/ai.service';

declare var bootstrap: any;

@Component({
  selector: 'app-pharmacy-dashboard',
  templateUrl: './pharmacy-dashboard.component.html',
  styleUrls: ['./pharmacy-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe]
})
export class PharmacyDashboardComponent implements OnInit, OnDestroy {
  public patientService = inject(PatientService);
  public pharmacyService = inject(PharmacyService);
  public authService = inject(AuthService);
  public aiService = inject(AIService);
  private formBuilder = inject(FormBuilder);

  public medicineForm = this.formBuilder.group({
    id: [''],
    name: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]],
    minStock: [10, [Validators.required, Validators.min(0)]],
    expiryMonth: ['', Validators.required],
    expiryYear: ['', Validators.required]
  });

  private refreshSubscription: Subscription | null = null;

  public patients = computed(() => {
    return this.patientService.patients().filter(
      p => p.status === 'completed' && p.medicalHistory.some(h => h.prescription && h.prescription.length > 0)
    );
  });

  ngOnInit(): void {
    this.medicineForm.reset();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  public showOnlyExpiringSoon = signal(false);
  public years: number[] = [];
  public months = [
    { value: '01', name: 'January' }, { value: '02', name: 'February' }, { value: '03', name: 'March' },
    { value: '04', name: 'April' }, { value: '05', name: 'May' }, { value: '06', name: 'June' },
    { value: '07', name: 'July' }, { value: '08', name: 'August' }, { value: '09', name: 'September' },
    { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' }
  ];

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 15; i++) {
      this.years.push(currentYear + i);
    }
  }

  public totalInventoryValue = computed(() =>
    this.pharmacyService.medicines().reduce((acc, med) => acc + (med.price * med.quantity), 0)
  );

  public lowStockCount = computed(() =>
    this.pharmacyService.medicines().filter(med => med.quantity <= med.minStock).length
  );

  public expiringSoonCount = computed(() =>
    this.pharmacyService.medicines().filter(med => this.isExpiringSoon(med.expiryDate) && !this.isExpired(med.expiryDate)).length
  );

  public filteredMedicines = computed(() => {
    const medicines = this.pharmacyService.medicines();
    if (this.showOnlyExpiringSoon()) {
      return medicines.filter(med => this.isExpiringSoon(med.expiryDate) && !this.isExpired(med.expiryDate));
    }
    return medicines;
  });

  public selectedPatient = signal<Patient | null>(null);
  public selectedPrescription = signal<PrescriptionDetail[] | null>(null);
  public successMessage = signal<string | null>(null);

  private getExpiryDate(expiryDate: string): Date {
    const [year, month] = expiryDate.split('T')[0].split('-').map(Number);
    return new Date(year, month, 0);
  }

  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = this.getExpiryDate(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = this.getExpiryDate(expiryDate);
    return expiry.getTime() < today.getTime();
  }

  // ✅ بيشغل AI تلقائياً لما تفتح Modal الصرف
  openDispenseModal(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.aiService.drugInteractions.set(null);

    const latestHistory = patient.medicalHistory?.[patient.medicalHistory.length - 1];
    const medicines = latestHistory?.prescription?.map(p => p.medicineName) || [];

    if (medicines.length >= 2) {
      this.aiService.analyzeDrugInteractions(medicines);
    } else {
      this.aiService.drugInteractions.set({ safe: true, interactions: [] });
    }

    const modal = new bootstrap.Modal(document.getElementById('dispenseModal'));
    modal.show();
  }

  openPrescriptionModal(patient: Patient): void {
    this.selectedPatient.set(patient);
    const latestMedicalHistory = patient.medicalHistory?.[patient.medicalHistory.length - 1];
    if (latestMedicalHistory?.prescription) {
      this.selectedPrescription.set(latestMedicalHistory.prescription);
    }
    const modal = new bootstrap.Modal(document.getElementById('prescriptionModal'));
    modal.show();
  }

  async onDispenseMedication(): Promise<void> {
    if (!this.selectedPatient()) return;
    const patient = this.selectedPatient()!;
    
    // Deduct from inventory
    const latestHistory = patient.medicalHistory?.[patient.medicalHistory.length - 1];
    if (latestHistory?.prescription) {
      for (const med of latestHistory.prescription) {
        // Assuming 1 unit is dispensed per prescription line
        await this.pharmacyService.deductStock(med.medicineId, 1);
      }
    }

    this.patientService.dispenseMedication(patient.id);
    this.successMessage.set('Prescription dispensed and inventory updated');
    const modal = bootstrap.Modal.getInstance(document.getElementById('dispenseModal'));
    modal.hide();
    this.selectedPatient.set(null);
    this.aiService.drugInteractions.set(null);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  private getMedicineFromForm(): Omit<Medicine, 'id'> {
    const formValue = this.medicineForm.value;
    const expiryDate = `${formValue.expiryYear}-${formValue.expiryMonth}-01`;
    return {
      name: formValue.name!,
      quantity: formValue.quantity!,
      price: formValue.price!,
      minStock: formValue.minStock!,
      expiryDate: expiryDate
    };
  }

  onAddMedicine(): void {
    if (this.medicineForm.invalid) return;
    this.pharmacyService.addMedicine(this.getMedicineFromForm());
    this.medicineForm.reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
    modal.hide();
  }

  onEditMedicine(medicine: Medicine): void {
    const [year, month] = medicine.expiryDate.split('T')[0].split('-');
    this.medicineForm.patchValue({ ...medicine, expiryMonth: month, expiryYear: year });
  }

  onUpdateMedicine(): void {
    if (this.medicineForm.invalid) return;
    const updatedMedicine = { ...this.getMedicineFromForm(), id: this.medicineForm.value.id! };
    this.pharmacyService.updateMedicine(updatedMedicine as Medicine);
    const modal = bootstrap.Modal.getInstance(document.getElementById('editMedicineModal'));
    modal.hide();
  }

  onDeleteMedicine(id: string): void {
    this.pharmacyService.deleteMedicine(id);
  }

  formatExpiryDate(expiryDate: string): string {
    if (!expiryDate) return '';
    const [year, month] = expiryDate.split('T')[0].split('-');
    return `${month} / ${year}`;
  }
}