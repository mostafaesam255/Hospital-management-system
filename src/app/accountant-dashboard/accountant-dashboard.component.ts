import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PatientService } from '../patient/patient.service';
import { Patient, ServiceDetail, PrescriptionDetail, Investigation, MedicalHistory } from '../patient/patient.model';

@Component({
  selector: 'app-accountant-dashboard',
  templateUrl: './accountant-dashboard.component.html',
  styleUrls: ['./accountant-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AccountantDashboardComponent {
  public patientService = inject(PatientService);
  public selectedPatient = signal<Patient | null>(null);
  public today = new Date();

  public patientsNeedingBilling = computed(() => {
    const patients = this.patientService.patients().filter(patient => {
      const hasUnpaidItems = patient.medicalHistory.some(visit =>
        visit.requestedServices?.some(s => !s.paid) || visit.prescription?.some(m => !m.paid)
      ) || patient.investigations.some(i => !i.paid);
      return hasUnpaidItems;
    });
    console.log('Accountant seeing:', patients);
    return patients;
  });

  public billBreakdown = computed(() => {
    const patient = this.selectedPatient();
    if (!patient) return null;

    const unpaidServices: ServiceDetail[] = patient.medicalHistory.flatMap(
      visit => visit.requestedServices?.filter(s => !s.paid) ?? []
    );

    const unpaidMeds: PrescriptionDetail[] = patient.medicalHistory.flatMap(
      visit => visit.prescription?.filter(m => !m.paid) ?? []
    );

    const unpaidInvestigations: Investigation[] = patient.investigations.filter(i => !i.paid);

    const servicesTotal = unpaidServices.reduce((acc, service) => acc + service.price, 0);
    const medsTotal = unpaidMeds.reduce((acc, med) => acc + med.price, 0);
    const investigationTotal = unpaidInvestigations.reduce((acc, inv) => acc + (inv.price || 0), 0);

    const grandTotal = servicesTotal + medsTotal + investigationTotal;

    return {
      requestedServices: unpaidServices,
      investigations: unpaidInvestigations,
      prescribedMeds: unpaidMeds,
      grandTotal,
    };
  });

  selectPatient(patient: Patient): void {
    this.selectedPatient.set(patient);
  }

  finalizePayment(): void {
    const patient = this.selectedPatient();
    if (patient) {
      this.patientService.finalizePatientBilling(patient.id);
      this.selectedPatient.set(null);
    }
  }

  printInvoice(): void {
    window.print();
  }
}
