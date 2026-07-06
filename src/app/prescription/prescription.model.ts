import { Patient } from "../patient/patient.model";

export interface Prescription {
  id: string;
  patient: Patient;
  doctor: string;
  medication: string;
  dosage: string;
  frequency: string;
  filled: boolean;
}
