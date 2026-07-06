import { Patient } from "../patient/patient.model";

export interface Appointment {
  id: string;
  patient: Patient;
  doctor: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'canceled';
}
