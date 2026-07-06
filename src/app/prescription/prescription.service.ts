import { inject, Injectable, signal } from '@angular/core';
import { Prescription } from './prescription.model';
import { PatientService } from '../patient/patient.service';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  private patientService = inject(PatientService);
  private prescriptions = signal<Prescription[]>([]);

  constructor() {
    const patients = this.patientService.patients();
    if (patients.length > 0) {
      const initialPrescriptions: Prescription[] = [
        {
          id: '1',
          patient: patients[0],
          doctor: 'Dr. Smith',
          medication: 'Amoxicillin',
          dosage: '500mg',
          frequency: 'Twice a day',
          filled: false,
        },
        {
          id: '2',
          patient: patients[1],
          doctor: 'Dr. Jones',
          medication: 'Ibuprofen',
          dosage: '200mg',
          frequency: 'As needed for pain',
          filled: true,
        },
      ];
      this.prescriptions.set(initialPrescriptions);
    }
  }

  getPrescriptions() {
    return this.prescriptions();
  }

  updatePrescription(updatedPrescription: Prescription) {
    this.prescriptions.update(prescriptions =>
      prescriptions.map(prescription =>
        prescription.id === updatedPrescription.id ? updatedPrescription : prescription
      )
    );
  }
}
