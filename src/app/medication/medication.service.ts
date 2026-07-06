import { Injectable, signal } from '@angular/core';
import { Medication } from './medication.model';

const MEDICATIONS: Medication[] = [
  { id: '1', name: 'Amoxicillin', quantity: 100 },
  { id: '2', name: 'Ibuprofen', quantity: 200 },
  { id: '3', name: 'Paracetamol', quantity: 150 },
];

@Injectable({
  providedIn: 'root'
})
export class MedicationService {

  private medications = signal<Medication[]>(MEDICATIONS);

  getMedications() {
    return this.medications();
  }

  updateMedication(updatedMedication: Medication) {
    this.medications.update(medications =>
      medications.map(medication =>
        medication.id === updatedMedication.id ? updatedMedication : medication
      )
    );
  }
}
