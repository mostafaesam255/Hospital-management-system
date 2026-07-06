export const CLINICS = [
  { id: '1', name: 'Cardiology' },
  { id: '2', name: 'Neurology' },
  { id: '3', name: 'Oncology' },
  { id: '4', name: 'Pediatrics' },
];

export interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacy' | 'investigation' | 'accountant';
  clinicId?: string;
  phone?: string;
  email?: string;
  profilePicUrl?: string; 
}
