import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientService } from '../patient/patient.service';
import { Patient, MedicalHistory, ServiceDetail, PrescriptionDetail } from '../patient/patient.model';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { Medicine } from '../pharmacy/pharmacy.model';

@Component({
  selector: 'app-admin-analytics',
  imports: [CommonModule, CurrencyPipe, RouterModule],
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['./admin-analytics.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsComponent {
  private patientService = inject(PatientService);
  private pharmacyService = inject(PharmacyService);

  private patients = this.patientService.patients;
  private medications = this.pharmacyService.medicines;

  public totalRevenue = computed(() => {
    // ⚠️ Note: Currently, the backend PatientDto does not return medicalHistory.
    // If the backend isn't updated, this will calculate 0.
    const revenue = this.patients().reduce((acc: number, patient: Patient) => {
      const servicesSum = (patient.medicalHistory || [])
        .flatMap((visit: MedicalHistory) => visit.requestedServices || [])
        .filter((s: ServiceDetail) => s.paid === true)
        .reduce((sum: number, s: ServiceDetail) => sum + (Number(s.price) || 0), 0);

      const medsSum = (patient.medicalHistory || [])
        .flatMap((visit: MedicalHistory) => visit.prescription || [])
        .filter((m: PrescriptionDetail) => m.paid === true)
        .reduce((sum: number, m: PrescriptionDetail) => sum + (Number(m.price) || 0), 0);

      return acc + servicesSum + medsSum;
    }, 0);
    console.log('Total Calculated Revenue:', revenue);
    return revenue;
  });

  public totalPatients = computed(() => {
    return this.patients().length;
  });

  public lowStockItems = computed(() => {
    const meds = this.medications() || [];
    return meds.filter((med: Medicine) => (Number(med.quantity) || 0) <= 5);
  });

  public lowStockMeds = computed(() => {
    return this.lowStockItems().length;
  });

  constructor() {
    // Patients and Medications are loaded automatically by their respective services 
    // when they are instantiated.
  }
}
