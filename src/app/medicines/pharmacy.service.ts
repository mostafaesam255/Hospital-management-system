
import { Injectable, signal } from '@angular/core';
import { Medicine } from './medicine.model';

@Injectable({
  providedIn: 'root'
})
export class PharmacyService {
  private medicines = signal<Medicine[]>(
    localStorage.getItem('hms_medicines') 
      ? JSON.parse(localStorage.getItem('hms_medicines')!) 
      : [
        { id: 'M001', name: 'Aspirin', quantity: 100, price: 5.99, minStock: 20 },
        { id: 'M002', name: 'Ibuprofen', quantity: 50, price: 7.50, minStock: 15 },
        { id: 'M003', name: 'Paracetamol', quantity: 200, price: 4.25, minStock: 30 },
      ]
  );

  getMedicines() {
    return this.medicines.asReadonly();
  }

  addMedicine(medicine: Omit<Medicine, 'id'>) {
    const newMedicine: Medicine = {
      ...medicine,
      id: `M${Date.now()}`
    };
    this.medicines.update(medicines => [...medicines, newMedicine]);
    this.saveToStorage();
  }

  updateStock(medicineId: string, newQuantity: number) {
    this.medicines.update(medicines =>
      medicines.map(med =>
        med.id === medicineId ? { ...med, quantity: newQuantity } : med
      )
    );
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('hms_medicines', JSON.stringify(this.medicines()));
  }
}
