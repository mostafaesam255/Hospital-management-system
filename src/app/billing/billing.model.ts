export interface Invoice {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'paid';
  services: string[]; // e.g., ['Consultation', 'X-Ray']
}
