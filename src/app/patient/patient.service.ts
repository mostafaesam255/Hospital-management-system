import { Injectable, signal, inject, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Investigation, InvestigationName, InvestigationStatus,
  InvestigationType, Patient, PrescriptionDetail, ServiceDetail, MedicalHistory
} from './patient.model';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PatientService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  public patients = signal<Patient[]>([]);
  public isLoading = signal(false);

  private pollingIntervalId: any = null;

  constructor() {
    // ✅ إعادة تحميل المرضى كل ما المستخدم يتغير (Login/Logout)
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadPatients();
        this.startPolling();
      } else {
        this.patients.set([]);
        this.stopPolling();
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'hms_user' || e.key === 'hms_token') {
        this.loadPatients();
      }
    });
  }

  private startPolling(): void {
    if (this.pollingIntervalId) return;
    this.pollingIntervalId = setInterval(async () => {
      if (this.authService.currentUser() && !this.isLoading()) {
        await this.loadPatients(true);
      }
    }, 15000);
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

  // ✅ جيب كل المرضى + حدّث الـ Status بناءً على وجود الـ Vitals (معدل للعمل محلياً)
  async loadPatients(silent: boolean = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    try {
      const currentUser = this.authService.currentUser();

      if (!currentUser) {
        if (!silent) this.isLoading.set(false);
        return;
      }

       // Load patient array from localStorage
      let patientsList: Patient[] = [];
      const storedPatients = localStorage.getItem('hms_patients');
      if (!storedPatients) {
        const defaultPatients = [
          {
            id: 'p1',
            name: 'Mostafa',
            nationalId: '12345678910124',
            gender: 'male' as const,
            contact: '01234567890',
            clinicId: 'c1',
            status: 'Ready' as const,
            medicalHistory: [],
            investigations: [],
            isBilled: false,
            dateOfBirth: '1995-01-01',
            address: 'Cairo, Egypt',
            vitals: { height: 175, weight: 70, bloodPressure: '120/80', temperature: 37, pulse: 75, oxygenSaturation: 98 }
          },
          {
            id: 'p2',
            name: 'Saif',
            nationalId: '12345678912345',
            gender: 'male' as const,
            contact: '01123456789',
            clinicId: 'c1',
            status: 'Ready' as const,
            medicalHistory: [],
            investigations: [],
            isBilled: false,
            dateOfBirth: '1998-05-15',
            address: 'Giza, Egypt',
            vitals: { height: 180, weight: 80, bloodPressure: '130/85', temperature: 36.8, pulse: 78, oxygenSaturation: 97 }
          },
          {
            id: 'p3',
            name: 'MOHAMED',
            nationalId: '30410314509464',
            gender: 'male' as const,
            contact: '01012345678',
            clinicId: 'c1',
            status: 'Ready' as const,
            medicalHistory: [],
            investigations: [],
            isBilled: false,
            dateOfBirth: '2004-10-31',
            address: 'Alexandria, Egypt',
            vitals: { height: 170, weight: 75, bloodPressure: '125/82', temperature: 37.2, pulse: 80, oxygenSaturation: 99 }
          }
        ];
        localStorage.setItem('hms_patients', JSON.stringify(defaultPatients));
        patientsList = defaultPatients;

        // Seed default vitals into vitals store too
        const initialVitals: Record<string, any> = {};
        defaultPatients.forEach(p => {
          if (p.vitals) initialVitals[p.id.toLowerCase()] = p.vitals;
        });
        localStorage.setItem('hms_patient_vitals', JSON.stringify(initialVitals));
      } else {
        patientsList = JSON.parse(storedPatients);
      }

      const readyIds: string[] = JSON.parse(localStorage.getItem('hms_ready_patients') || '[]');
      const completedIds: string[] = JSON.parse(localStorage.getItem('hms_completed_patients') || '[]');
      const dispensedIds: string[] = JSON.parse(localStorage.getItem('hms_dispensed_patients') || '[]');
      const savedVitals: Record<string, any> = JSON.parse(localStorage.getItem('hms_patient_vitals') || '{}');
      const savedHistory: Record<string, any[]> = JSON.parse(localStorage.getItem('hms_patient_history') || '{}');
      const savedInvestigations: Record<string, any[]> = JSON.parse(localStorage.getItem('hms_patient_investigations') || '{}');
      const newVisitIds: string[] = JSON.parse(localStorage.getItem('hms_new_visits') || '[]');

      let patients: Patient[] = patientsList.map(p => {
        const pid = p.id.toLowerCase();
        let status = p.status || 'Pending';
        let vitals = p.vitals || null;
        let medicalHistory = p.medicalHistory || [];
        let investigations = p.investigations || [];

        // Apply local vitals fallback
        if (savedVitals[pid]) {
          vitals = savedVitals[pid];
          if (status === 'Pending') status = 'Ready';
        }

        // Apply local investigations
        if (savedInvestigations[pid]) {
          investigations = savedInvestigations[pid];
        }

        // Apply local medical history
        if (savedHistory[pid]) {
          medicalHistory = savedHistory[pid];
        }

        // Apply status overrides
        if (readyIds.some(id => id.toLowerCase() === pid) && status === 'Pending') {
          status = 'Ready';
        }
        if (completedIds.some(id => id.toLowerCase() === pid)) {
          status = 'completed';
        }
        if (dispensedIds.some(id => id.toLowerCase() === pid)) {
          status = 'dispensed';
        }

        const isNewVisit = newVisitIds.some(id => id.toLowerCase() === pid);
        if (medicalHistory.length > 0 && !isNewVisit && (status === 'Pending' || status === 'Ready')) {
          status = 'completed';
        }

        const hasPendingInv = investigations.some(inv => inv.status === 'Requested' || inv.status === 'In Progress');
        if (hasPendingInv && (status === 'Pending' || status === 'Ready')) {
          status = 'In-progress';
        }

        return {
          ...p,
          status,
          vitals,
          medicalHistory,
          investigations
        };
      });

      // Filter by clinicId for doctor / nurse
      if ((currentUser?.role === 'doctor' || currentUser?.role === 'nurse') && currentUser?.clinicId != null) {
        patients = patients.filter(p => 
          p.clinicId != null && String(p.clinicId) === String(currentUser.clinicId)
        );
      }

      const currentData = JSON.stringify(this.patients());
      const newData = JSON.stringify(patients);
      if (currentData !== newData) {
        this.patients.set(patients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      if (!silent) this.isLoading.set(false);
    }
  }

  public refreshPatients(): void {
    this.loadPatients();
  }

  // ✅ أضف مريض جديد - محلياً
  async addPatient(patient: Omit<Patient, 'id'>): Promise<void> {
    if (this.findPatientByNationalId(patient.nationalId)) {
      throw new Error('This National ID is already registered');
    }

    try {
      const storedPatients = localStorage.getItem('hms_patients');
      const patientsList: Patient[] = storedPatients ? JSON.parse(storedPatients) : [];

      const newPatient: Patient = {
        id: 'p_' + Math.random().toString(36).substring(2, 9),
        name: patient.name,
        nationalId: patient.nationalId,
        gender: patient.gender,
        contact: patient.contact,
        clinicId: patient.clinicId,
        status: 'Pending',
        medicalHistory: [],
        investigations: [],
        isBilled: false,
        dateOfBirth: patient.dateOfBirth,
        address: patient.address,
        vitals: null as any
      };

      patientsList.push(newPatient);
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
      await this.loadPatients();
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  }

  // ✅ عدّل مريض - محلياً
  async updatePatient(updatedPatient: Patient): Promise<void> {
    try {
      const storedPatients = localStorage.getItem('hms_patients');
      let patientsList: Patient[] = storedPatients ? JSON.parse(storedPatients) : [];

      patientsList = patientsList.map(p => {
        if (String(p.id) === String(updatedPatient.id)) {
          return {
            ...p,
            name: updatedPatient.name,
            nationalId: updatedPatient.nationalId,
            gender: updatedPatient.gender,
            contact: updatedPatient.contact,
            clinicId: updatedPatient.clinicId,
            dateOfBirth: updatedPatient.dateOfBirth,
            address: updatedPatient.address
          };
        }
        return p;
      });

      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
      await this.loadPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  }

  // ✅ احذف مريض - محلياً
  async deletePatient(id: string): Promise<void> {
    try {
      const storedPatients = localStorage.getItem('hms_patients');
      let patientsList: Patient[] = storedPatients ? JSON.parse(storedPatients) : [];

      patientsList = patientsList.filter(p => String(p.id) !== String(id));
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));

      const pid = id.toLowerCase();
      ['hms_patient_vitals', 'hms_patient_investigations', 'hms_patient_history'].forEach(key => {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        delete data[pid];
        localStorage.setItem(key, JSON.stringify(data));
      });

      await this.loadPatients();
    } catch (error: any) {
      console.error('Error deleting patient:', error);
    }
  }

  // ✅ احجز زيارة جديدة - محلياً
  async bookNewVisit(patientId: string, clinicId: string): Promise<void> {
    const pid = patientId.toLowerCase();

    // 1. Clear status flags
    const statusKeys = [
      'hms_completed_patients',
      'hms_ready_patients',
      'hms_dispensed_patients'
    ];
    statusKeys.forEach(key => {
      const ids = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
      ids.delete(pid);
      localStorage.setItem(key, JSON.stringify(Array.from(ids)));
    });

    // 2. Clear current visit details (vitals and investigations)
    ['hms_patient_vitals', 'hms_patient_investigations'].forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      delete data[pid];
      localStorage.setItem(key, JSON.stringify(data));
    });

    // 3. Mark as new visit to prevent automated complete
    const newVisitIds: string[] = JSON.parse(localStorage.getItem('hms_new_visits') || '[]');
    if (!newVisitIds.some(id => id.toLowerCase() === pid)) {
      newVisitIds.push(pid);
      localStorage.setItem('hms_new_visits', JSON.stringify(newVisitIds));
    }

    // 4. Update clinicId and status in patient storage
    const storedPatients = localStorage.getItem('hms_patients');
    if (storedPatients) {
      let patientsList: Patient[] = JSON.parse(storedPatients);
      patientsList = patientsList.map(p => {
        if (String(p.id).toLowerCase() === pid) {
          return {
            ...p,
            clinicId,
            status: 'Pending',
            vitals: null as any,
            investigations: []
          };
        }
        return p;
      });
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
    }

    await this.loadPatients();
  }

  getPatientById(id: string): Patient | undefined {
    return this.patients().find(p => p.id === id);
  }

  findPatientByNationalId(nationalId: string): Patient | undefined {
    return this.patients().find(p => p.nationalId === nationalId);
  }

  async updatePatientVitals(patientId: string, vitalsData: Patient['vitals']): Promise<void> {
    const pid = patientId.toLowerCase();
    
    // Save to localStorage
    const vitalsKey = 'hms_patient_vitals';
    const savedVitals = JSON.parse(localStorage.getItem(vitalsKey) || '{}');
    savedVitals[pid] = vitalsData;
    localStorage.setItem(vitalsKey, JSON.stringify(savedVitals));

    // Remove from Pending state if needed and mark as Ready
    const readyIds: string[] = JSON.parse(localStorage.getItem('hms_ready_patients') || '[]');
    if (!readyIds.some(id => id.toLowerCase() === pid)) {
      readyIds.push(pid);
      localStorage.setItem('hms_ready_patients', JSON.stringify(readyIds));
    }

    // Update patient status in storage
    const storedPatients = localStorage.getItem('hms_patients');
    if (storedPatients) {
      let patientsList: Patient[] = JSON.parse(storedPatients);
      patientsList = patientsList.map(p => {
        if (String(p.id).toLowerCase() === pid) {
          return { ...p, vitals: vitalsData, status: 'Ready' };
        }
        return p;
      });
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
    }

    await this.loadPatients();
  }

  async addConsultation(
    patientId: string,
    diagnosis: string,
    prescription: PrescriptionDetail[],
    doctorId: string,
    clinicId: string,
    requestedServices: ServiceDetail[]
  ): Promise<void> {
    const pid = patientId.toLowerCase();
    const newMedicalHistory: MedicalHistory = {
      date: new Date().toISOString(),
      diagnosis,
      prescription: prescription.map(p => ({ ...p, paid: false })),
      requestedServices: requestedServices.map(s => ({ ...s, paid: false })),
      doctorId,
      clinicId
    };

    // 1. Save history to localStorage
    const historyKey = 'hms_patient_history';
    const savedHistory = JSON.parse(localStorage.getItem(historyKey) || '{}');
    const existingHistory = savedHistory[pid] || [];
    savedHistory[pid] = [...existingHistory, newMedicalHistory];
    localStorage.setItem(historyKey, JSON.stringify(savedHistory));

    // 2. Update investigations status to Completed for any Results Ready
    const invKey = 'hms_patient_investigations';
    const savedInv: Record<string, Investigation[]> = JSON.parse(localStorage.getItem(invKey) || '{}');
    if (savedInv[pid]) {
      savedInv[pid] = savedInv[pid].map(inv => {
        if (inv.status === 'Results Ready') {
          return { ...inv, status: 'Completed' };
        }
        return inv;
      });
      localStorage.setItem(invKey, JSON.stringify(savedInv));
    }

    // 3. Mark patient as completed in localStorage
    const completedKey = 'hms_completed_patients';
    const completedIds: string[] = JSON.parse(localStorage.getItem(completedKey) || '[]');
    if (!completedIds.some(id => id.toLowerCase() === pid)) {
      completedIds.push(pid);
      localStorage.setItem(completedKey, JSON.stringify(completedIds));
    }

    // Remove from new visits and ready lists
    const newVisitIds: string[] = JSON.parse(localStorage.getItem('hms_new_visits') || '[]');
    localStorage.setItem('hms_new_visits', JSON.stringify(newVisitIds.filter(id => id.toLowerCase() !== pid)));

    const readyIds: string[] = JSON.parse(localStorage.getItem('hms_ready_patients') || '[]');
    localStorage.setItem('hms_ready_patients', JSON.stringify(readyIds.filter(id => id.toLowerCase() !== pid)));

    // 4. Update status in base hms_patients storage
    const storedPatients = localStorage.getItem('hms_patients');
    if (storedPatients) {
      let patientsList: Patient[] = JSON.parse(storedPatients);
      patientsList = patientsList.map(p => {
        if (String(p.id).toLowerCase() === pid) {
          return {
            ...p,
            status: 'completed',
            medicalHistory: [...(p.medicalHistory || []), newMedicalHistory]
          };
        }
        return p;
      });
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
    }

    await this.loadPatients();
  }

  async addInvestigationRequest(
    patientId: string,
    type: InvestigationType,
    name: InvestigationName,
    doctorId: string,
    price: number
  ): Promise<void> {
    const id = crypto.randomUUID();
    const newInvestigation: Investigation = {
      id,
      type,
      name,
      price,
      date: new Date().toISOString(),
      requestedBy: doctorId,
      status: 'Requested',
      paid: false
    };

    const pid = patientId.toLowerCase();
    
    // Save to localStorage investigations
    const invKey = 'hms_patient_investigations';
    const savedInv: Record<string, Investigation[]> = JSON.parse(localStorage.getItem(invKey) || '{}');
    savedInv[pid] = [...(savedInv[pid] || []), newInvestigation];
    localStorage.setItem(invKey, JSON.stringify(savedInv));

    // Update patient status in base storage
    const storedPatients = localStorage.getItem('hms_patients');
    if (storedPatients) {
      let patientsList: Patient[] = JSON.parse(storedPatients);
      patientsList = patientsList.map(p => {
        if (String(p.id).toLowerCase() === pid) {
          return { ...p, status: 'In-progress' };
        }
        return p;
      });
      localStorage.setItem('hms_patients', JSON.stringify(patientsList));
    }

    await this.loadPatients();
  }

  async updateInvestigationResult(
    patientId: string,
    investigationId: string,
    result: string,
    report: string,
    attachment: string
  ): Promise<void> {
    const pid = patientId.toLowerCase();
    const invKey = 'hms_patient_investigations';
    const savedInv: Record<string, Investigation[]> = JSON.parse(localStorage.getItem(invKey) || '{}');

    if (savedInv[pid]) {
      savedInv[pid] = savedInv[pid].map(inv => {
        if (inv.id === investigationId) {
          const newStatus: InvestigationStatus = result === 'In Progress' ? 'In Progress' : 'Results Ready';
          return { ...inv, result, report, attachment, status: newStatus };
        }
        return inv;
      });
      localStorage.setItem(invKey, JSON.stringify(savedInv));

      const updatedInvestigations = savedInv[pid];
      const hasResultsReady = updatedInvestigations.some(inv => inv.status === 'Results Ready');
      const hasPendingInvestigations = updatedInvestigations.some(
        inv => inv.status === 'Requested' || inv.status === 'In Progress'
      );
      const newStatus = hasResultsReady ? 'Ready' : (hasPendingInvestigations ? 'In-progress' : 'In-progress');

      const storedPatients = localStorage.getItem('hms_patients');
      if (storedPatients) {
        let patientsList: Patient[] = JSON.parse(storedPatients);
        patientsList = patientsList.map(p => {
          if (String(p.id).toLowerCase() === pid) {
            return { ...p, status: newStatus };
          }
          return p;
        });
        localStorage.setItem('hms_patients', JSON.stringify(patientsList));
      }

      if (hasResultsReady) {
        const readyIds: string[] = JSON.parse(localStorage.getItem('hms_ready_patients') || '[]');
        if (!readyIds.some(id => id.toLowerCase() === pid)) {
          readyIds.push(pid);
          localStorage.setItem('hms_ready_patients', JSON.stringify(readyIds));
        }
        const completedIds: string[] = JSON.parse(localStorage.getItem('hms_completed_patients') || '[]');
        localStorage.setItem('hms_completed_patients',
          JSON.stringify(completedIds.filter(id => id.toLowerCase() !== pid)));
      }
    }

    await this.loadPatients();
  }


  updatePatientStatus(
    patientId: string,
    status: 'Pending' | 'Ready' | 'In-progress' | 'Completed' | 'in-pharmacy' | 'completed'
  ): void {
    this.patients.update(patients =>
      patients.map(p => p.id === patientId ? { ...p, status } : p)
    );
  }

  dispenseMedication(patientId: string): void {
    const pid = patientId.toLowerCase();
    const dispensedKey = 'hms_dispensed_patients';
    const dispensedIds = new Set<string>(JSON.parse(localStorage.getItem(dispensedKey) || '[]'));
    dispensedIds.add(pid);
    localStorage.setItem(dispensedKey, JSON.stringify(Array.from(dispensedIds)));

    // ✅ إزالة المعرّف من قائمة الـ completed والـ ready لتجنب التعارض عند التحديث
    const completedKey = 'hms_completed_patients';
    const completedIds = new Set<string>(JSON.parse(localStorage.getItem(completedKey) || '[]'));
    completedIds.delete(pid);
    localStorage.setItem(completedKey, JSON.stringify(Array.from(completedIds)));

    const readyKey = 'hms_ready_patients';
    const readyIds = new Set<string>(JSON.parse(localStorage.getItem(readyKey) || '[]'));
    readyIds.delete(pid);
    localStorage.setItem(readyKey, JSON.stringify(Array.from(readyIds)));

    this.patients.update(patients =>
      patients.map(patient => {
        if (patient.id === patientId) {
          const hasPendingInvestigations = patient.investigations.some(
            inv => inv.status === 'Requested' || inv.status === 'In Progress' || inv.status === 'Results Ready'
          );
          return { ...patient, status: hasPendingInvestigations ? 'In-progress' : 'dispensed' as any };
        }
        return patient;
      })
    );
  }

  finalizePatientBilling(patientId: string): void {
    this.patients.update(patients =>
      patients.map(patient => {
        if (patient.id === patientId) {
          const updatedMedicalHistory = patient.medicalHistory.map(visit => ({
            ...visit,
            requestedServices: visit.requestedServices?.map(s => ({ ...s, paid: true })),
            prescription: visit.prescription?.map(m => ({ ...m, paid: true }))
          }));
          const updatedInvestigations = patient.investigations.map(i => ({ ...i, paid: true }));

          const pid = patient.id.toLowerCase();
          
          // Update medical history in localStorage
          const historyKey = 'hms_patient_history';
          const savedHistory = JSON.parse(localStorage.getItem(historyKey) || '{}');
          savedHistory[pid] = updatedMedicalHistory;
          localStorage.setItem(historyKey, JSON.stringify(savedHistory));

          // Update investigations in localStorage
          const invKey = 'hms_patient_investigations';
          const savedInv = JSON.parse(localStorage.getItem(invKey) || '{}');
          savedInv[pid] = updatedInvestigations;
          localStorage.setItem(invKey, JSON.stringify(savedInv));

          return { ...patient, medicalHistory: updatedMedicalHistory, investigations: updatedInvestigations, status: 'completed' };
        }
        return patient;
      })
    );
  }
}