import { Medicine } from '../pharmacy/pharmacy.model';

export type InvestigationType = 'lab' | 'scan';

export type InvestigationStatus = 'Requested' | 'In Progress' | 'Results Ready' | 'Completed';

export type InvestigationName = 'CBC' | 'Glucose' | 'Liver Function' | 'X-Ray' | 'Ultrasound' | 'MRI' | 'CT Scan' | 'CBC Lab' | 'Glucose Lab';

export interface Investigation {
  id: string;
  type: InvestigationType;
  name: InvestigationName;
  price: number;
  date: string;
  requestedBy: string; // doctorId
  status: InvestigationStatus;
  result?: string;
  report?: string;
  attachment?: string; // Base64 encoded image
  paid: boolean;
}

export interface ServiceDetail {
  name: string;
  price: number;
  paid: boolean;
}

export interface PrescriptionDetail {
  medicineId: string;
  medicineName: string;
  price: number;
  dosage: string;
  frequency: string;
  paid: boolean;
}

export interface MedicalHistory {
    date: string;
    diagnosis: string;
    prescription: PrescriptionDetail[];
    doctorId: string;
    clinicId: string;
    requestedServices?: ServiceDetail[];
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  contact: string;
  address: string;
  nationalId: string;
  clinicId: string;
  status: 'Pending' | 'In-progress' | 'Completed' | 'Ready' | 'in-pharmacy' | 'completed' | 'dispensed';
  isBilled: boolean;
  insuranceProvider?: string;
  policyNumber?: string;
  vitals: {
    height: number;
    weight: number;
    bloodPressure: string;
    temperature: number;
    pulse: number;
    oxygenSaturation: number;
  };
  medicalHistory: MedicalHistory[];
  investigations: Investigation[];
}
