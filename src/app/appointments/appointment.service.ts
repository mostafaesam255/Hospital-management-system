import { computed, inject, Injectable, signal } from '@angular/core';
import { Appointment } from './appointment.model';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private storageKey = 'hms_appointments';
  private authService = inject(AuthService);
  public appointments = signal<Appointment[]>(this.loadAppointments());

  public appointmentsForDoctor = computed(() => {
    const user = this.authService.currentUser();
    if (user?.role !== 'doctor') return [];
    return this.appointments().filter(a => a.doctorId === user.id);
  });

  private loadAppointments(): Appointment[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [
      { id: '1', patientName: 'John Doe', appointmentTime: new Date().toISOString(), doctorId: '1', status: 'Pending' },
      { id: '2', patientName: 'Jane Smith', appointmentTime: new Date().toISOString(), doctorId: '1', status: 'Completed' },
    ];
  }

  updateStatus(id: string, status: 'Pending' | 'Completed') {
    this.appointments.update(appointments => 
      appointments.map(a => a.id === id ? { ...a, status } : a)
    );
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.appointments()));
  }
}
