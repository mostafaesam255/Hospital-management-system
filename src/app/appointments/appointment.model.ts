export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  appointmentTime: string;
  status: 'Pending' | 'Completed';
}
