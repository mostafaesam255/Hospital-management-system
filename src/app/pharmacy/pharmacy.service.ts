import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Medicine } from './pharmacy.model';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PharmacyService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/Drug`;

  public medicines = signal<Medicine[]>([]);
  public isLoading = signal(false);

  private pollingIntervalId: any = null;

  constructor() {
    this.loadMedicines();
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingIntervalId) return;
    this.pollingIntervalId = setInterval(async () => {
      if (this.authService.currentUser() && !this.isLoading()) {
        await this.loadMedicines(true);
      }
    }, 20000);
  }

  private stopPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async loadMedicines(silent: boolean = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    try {
      let medsList: Medicine[] = [];
      const storedMeds = localStorage.getItem('hms_medicines');
      if (!storedMeds) {
        const defaultMedicines = [
          { id: 'm1', name: 'Panadol Extra', quantity: 150, price: 5, minStock: 20, expiryDate: '2027-12-31' },
          { id: 'm2', name: 'Amoxicillin 500mg', quantity: 80, price: 12, minStock: 15, expiryDate: '2027-06-30' },
          { id: 'm3', name: 'Lipitor 20mg', quantity: 200, price: 25, minStock: 30, expiryDate: '2028-03-31' },
          { id: 'm4', name: 'Metformin 850mg', quantity: 120, price: 8, minStock: 25, expiryDate: '2028-09-30' },
          { id: 'm5', name: 'Concor 5mg', quantity: 90, price: 15, minStock: 20, expiryDate: '2027-10-31' }
        ];
        localStorage.setItem('hms_medicines', JSON.stringify(defaultMedicines));
        medsList = defaultMedicines;
      } else {
        medsList = JSON.parse(storedMeds);
      }

      // Sync minStock from map if exists
      const minStockMap = localStorage.getItem('hms-drug-min-stock')
        ? JSON.parse(localStorage.getItem('hms-drug-min-stock')!)
        : {};
      medsList = medsList.map(m => ({
        ...m,
        minStock: minStockMap[m.id] !== undefined ? minStockMap[m.id] : (m.minStock || 10)
      }));

      const currentData = JSON.stringify(this.medicines());
      const newData = JSON.stringify(medsList);
      if (currentData !== newData) {
        this.medicines.set(medsList);
      }
    } catch (error) {
      console.error('Error loading medicines from local storage:', error);
    } finally {
      if (!silent) this.isLoading.set(false);
    }
  }

  async addMedicine(medicine: Omit<Medicine, 'id'>) {
    try {
      const storedMeds = localStorage.getItem('hms_medicines');
      const medsList: Medicine[] = storedMeds ? JSON.parse(storedMeds) : [];

      const newMed: Medicine = {
        id: 'm_' + Math.random().toString(36).substring(2, 9),
        name: medicine.name,
        quantity: medicine.quantity,
        price: medicine.price,
        minStock: medicine.minStock || 10,
        expiryDate: medicine.expiryDate
      };

      medsList.push(newMed);
      localStorage.setItem('hms_medicines', JSON.stringify(medsList));

      // Save minStock map
      const minStockMap = localStorage.getItem('hms-drug-min-stock')
        ? JSON.parse(localStorage.getItem('hms-drug-min-stock')!)
        : {};
      minStockMap[newMed.id] = medicine.minStock;
      localStorage.setItem('hms-drug-min-stock', JSON.stringify(minStockMap));

      await this.loadMedicines();
    } catch (error: any) {
      console.error('Error adding medicine:', error);
    }
  }

  async updateMedicine(updatedMedicine: Medicine) {
    try {
      const storedMeds = localStorage.getItem('hms_medicines');
      let medsList: Medicine[] = storedMeds ? JSON.parse(storedMeds) : [];

      medsList = medsList.map(m => {
        if (String(m.id) === String(updatedMedicine.id)) {
          return {
            ...m,
            name: updatedMedicine.name,
            quantity: updatedMedicine.quantity,
            price: updatedMedicine.price,
            minStock: updatedMedicine.minStock,
            expiryDate: updatedMedicine.expiryDate
          };
        }
        return m;
      });

      localStorage.setItem('hms_medicines', JSON.stringify(medsList));

      const minStockMap = localStorage.getItem('hms-drug-min-stock')
        ? JSON.parse(localStorage.getItem('hms-drug-min-stock')!)
        : {};
      minStockMap[updatedMedicine.id] = updatedMedicine.minStock;
      localStorage.setItem('hms-drug-min-stock', JSON.stringify(minStockMap));

      await this.loadMedicines();
    } catch (error) {
      console.error('Error updating medicine:', error);
    }
  }

  async deleteMedicine(id: string) {
    try {
      const storedMeds = localStorage.getItem('hms_medicines');
      let medsList: Medicine[] = storedMeds ? JSON.parse(storedMeds) : [];

      medsList = medsList.filter(m => String(m.id) !== String(id));
      localStorage.setItem('hms_medicines', JSON.stringify(medsList));

      await this.loadMedicines();
    } catch (error) {
      console.error('Error deleting medicine:', error);
    }
  }

  async deductStock(medicineId: string, quantity: number) {
    try {
      const storedMeds = localStorage.getItem('hms_medicines');
      let medsList: Medicine[] = storedMeds ? JSON.parse(storedMeds) : [];

      medsList = medsList.map(m => {
        if (String(m.id) === String(medicineId)) {
          return {
            ...m,
            quantity: Math.max(0, m.quantity - quantity)
          };
        }
        return m;
      });

      localStorage.setItem('hms_medicines', JSON.stringify(medsList));
      await this.loadMedicines();
    } catch (error) {
      console.error('Error deducting stock:', error);
    }
  }
}
