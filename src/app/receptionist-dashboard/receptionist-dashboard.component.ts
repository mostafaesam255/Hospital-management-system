import { ChangeDetectionStrategy, Component, inject, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../patient/patient.service';
import { ClinicService } from '../clinics/clinic.service';
import { Patient } from '../patient/patient.model';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillingService } from '../billing/billing.service';
import { AIService } from '../shared/ai.service';

declare var bootstrap: any;

@Component({
  selector: 'app-receptionist-dashboard',
  templateUrl: './receptionist-dashboard.component.html',
  styleUrls: ['./receptionist-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class ReceptionistDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  public patientService = inject(PatientService);
  public clinicService = inject(ClinicService);
  public aiService = inject(AIService);
  private formBuilder = inject(FormBuilder);
  private billingService = inject(BillingService);

  public patientForm = this.formBuilder.group({
    id: [''],
    name: ['', Validators.required],
    nationalId: ['', [Validators.required, Validators.pattern('^[0-9]{14}$')]],
    gender: ['' as 'male' | 'female' | 'other', Validators.required],
    contact: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
    clinicId: ['', Validators.required],
    complaint: [''], 
    insuranceProvider: [''],
    policyNumber: ['']
  });

  public invoiceForm = this.formBuilder.group({
    amount: ['', [Validators.required, Validators.min(1)]],
    services: ['', Validators.required]
  });

  public errorMessage = signal<string | null>(null);
  public successMessage = signal<string | null>(null);
  public isBookingMode = signal(false);
  public selectedPatient = signal<Patient | null>(null);

  private addModalListener: (() => void) | null = null;
  private editModalListener: (() => void) | null = null;

  ngOnInit(): void {
    this.patientForm.reset();
  }

  ngAfterViewInit(): void {
    const addModalEl = document.getElementById('addPatientModal');
    if (addModalEl) {
      this.addModalListener = () => {
        this.isBookingMode.set(false);
        this.patientForm.reset();
        this.patientForm.enable();
        this.aiService.priorityAnalysis.set(null);
        this.errorMessage.set(null);
        this.successMessage.set(null);
      };
      addModalEl.addEventListener('hidden.bs.modal', this.addModalListener);
    }

    const editModalEl = document.getElementById('editPatientModal');
    if (editModalEl) {
      this.editModalListener = () => {
        this.patientForm.reset();
        this.patientForm.enable();
        this.errorMessage.set(null);
        this.successMessage.set(null);
      };
      editModalEl.addEventListener('hidden.bs.modal', this.editModalListener);
    }
  }

  ngOnDestroy(): void {
    const addModalEl = document.getElementById('addPatientModal');
    if (addModalEl && this.addModalListener) {
      addModalEl.removeEventListener('hidden.bs.modal', this.addModalListener);
    }
    const editModalEl = document.getElementById('editPatientModal');
    if (editModalEl && this.editModalListener) {
      editModalEl.removeEventListener('hidden.bs.modal', this.editModalListener);
    }
  }

  prepareRegisterNewPatient(): void {
    this.isBookingMode.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.patientForm.reset();
    this.patientForm.enable();
    this.aiService.priorityAnalysis.set(null);

    const modalElement = document.getElementById('addPatientModal');
    if (modalElement) {
      let modal = bootstrap.Modal.getInstance(modalElement);
      if (!modal) {
        modal = new bootstrap.Modal(modalElement);
      }
      modal.show();
    }
  }

  async onAnalyzePriority(): Promise<void> {
    const complaint = this.patientForm.get('complaint')?.value;
    if (!complaint || complaint.trim().length < 3) return;
    await this.aiService.analyzePriority(complaint);
  }

  onSearch(nationalId: string): void {
    const patient = this.patientService.findPatientByNationalId(nationalId);
    this.isBookingMode.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.patientForm.reset();
    this.patientForm.enable();
    this.aiService.priorityAnalysis.set(null);

    if (patient) {
      this.isBookingMode.set(true);
      this.patientForm.patchValue({
        id: patient.id,
        name: patient.name,
        nationalId: patient.nationalId,
        contact: patient.contact,
        gender: patient.gender,
        insuranceProvider: patient.insuranceProvider,
        policyNumber: patient.policyNumber,
        clinicId: ''
      });
      this.patientForm.get('name')?.disable();
      this.patientForm.get('contact')?.disable();
      this.patientForm.get('gender')?.disable();
      this.patientForm.get('nationalId')?.disable();
      this.successMessage.set('Existing Patient Found. Ready to book a new visit');
    } else {
      this.isBookingMode.set(false);
      this.patientForm.enable();
      this.errorMessage.set('Patient not found. Please register as new.');
    }

    const modalElement = document.getElementById('addPatientModal');
    if (modalElement) {
      let modal = bootstrap.Modal.getInstance(modalElement);
      if (!modal) {
        modal = new bootstrap.Modal(modalElement);
      }
      modal.show();
    }
  }

  async onAddPatient(): Promise<void> {
    if (this.patientForm.invalid) return;

    try {
      if (this.isBookingMode()) {
        const patientId = this.patientForm.get('id')?.value;
        const clinicId = this.patientForm.get('clinicId')?.value;
        if (patientId && clinicId) {
          await this.patientService.bookNewVisit(patientId, clinicId);
          this.successMessage.set('New visit booked successfully!');
        }
      } else {
        const newPatient: Partial<Patient> = {
          name: this.patientForm.value.name!,
          nationalId: this.patientForm.value.nationalId!,
          gender: this.patientForm.value.gender!,
          contact: this.patientForm.value.contact!,
          clinicId: this.patientForm.value.clinicId!,
          insuranceProvider: this.patientForm.value.insuranceProvider || undefined,
          policyNumber: this.patientForm.value.policyNumber || undefined,
          status: 'Pending'
        };
        await this.patientService.addPatient(newPatient as Patient);
        this.successMessage.set('Patient registered successfully!');
      }

      this.patientForm.reset();
      this.errorMessage.set(null);
      this.aiService.priorityAnalysis.set(null);
      
      const modalElement = document.getElementById('addPatientModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error('Error saving patient:', error);
      this.errorMessage.set(error.message || 'Error occurred while saving patient');
    }
  }

  onEditPatient(patient: Patient): void {
    this.patientForm.enable();
    this.patientForm.patchValue(patient);
    
    const modalElement = document.getElementById('editPatientModal');
    if (modalElement) {
      let modal = bootstrap.Modal.getInstance(modalElement);
      if (!modal) {
        modal = new bootstrap.Modal(modalElement);
      }
      modal.show();
    }
  }

  async onUpdatePatient(): Promise<void> {
    if (this.patientForm.invalid) return;
    try {
      await this.patientService.updatePatient(this.patientForm.value as Patient);
      
      const modalElement = document.getElementById('editPatientModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error('Error updating patient:', error);
      this.errorMessage.set(error.message || 'Error occurred while updating patient');
    }
  }

  onDeletePatient(id: string): void {
    this.patientService.deletePatient(id);
  }

  openInvoiceModal(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.invoiceForm.reset();
  }

  onGenerateInvoice(): void {
    if (this.invoiceForm.invalid || !this.selectedPatient()) return;
    const newInvoice = {
      patientId: this.selectedPatient()!.id,
      patientName: this.selectedPatient()!.name,
      amount: +this.invoiceForm.value.amount!,
      services: this.invoiceForm.value.services!.split(',').map(s => s.trim())
    };
    this.billingService.createInvoice(newInvoice);
    const modal = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
    modal.hide();
  }

  printPatient(patient: Patient): void {
    if (!patient) return;
    const clinicName = this.clinicService.getClinicName(patient.clinicId!);
    const printContent = `
      <html><head><title>Patient Details</title>
      <style>body{font-family:'Courier New',monospace;margin:20px}.receipt-container{border:1px solid #000;padding:15px;width:350px;margin:0 auto}</style>
      </head><body><div class="receipt-container">
      <h1>Official Hospital Receipt</h1>
      <p><strong>Name:</strong> ${patient.name}</p>
      <p><strong>National ID:</strong> ${patient.nationalId}</p>
      <p><strong>Clinic:</strong> ${clinicName}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div></body></html>`;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  }
}