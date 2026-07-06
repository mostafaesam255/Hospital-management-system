export interface Appointment {
  id: number;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  department: string;
  status: string;
}

export interface Bill {
  id: number;
  appointmentId: number;
  patientName: string;
  doctorName: string;
  date: string;
  grandTotal: number;
  paid: boolean;
}
