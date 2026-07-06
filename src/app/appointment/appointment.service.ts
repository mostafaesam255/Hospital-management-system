import { inject, Injectable, signal } from '@angular/core';
import { Appointment } from './appointment.model';
import { PatientService } from '../patient/patient.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private patientService = inject(PatientService);
  private appointments = signal<Appointment[]>([]);

  constructor() {
    const patients = this.patientService.patients();
    if (patients.length > 0) {
      const initialAppointments: Appointment[] = [
        {
          id: '1',
          patient: patients[0],
          doctor: 'Dr. Smith',
          date: '2024-10-26',
          time: '10:00 AM',
          reason: 'Annual Checkup',
          status: 'scheduled',
        },
        {
          id: '2',
          patient: patients[1],
          doctor: 'Dr. Jones',
          date: '2024-10-26',
          time: '11:00 AM',
          reason: 'Follow-up Consultation',
          status: 'scheduled',
        },
        {
          id: '3',
          patient: patients[2],
          doctor: 'Dr. Smith',
          date: '2024-10-27',
          time: '09:00 AM',
          reason: 'New Patient Visit',
          status: 'scheduled',
        },
      ];
      this.appointments.set(initialAppointments);
    }
  }

  getAppointmentsForDoctor(doctorName: string) {
    return this.appointments().filter(appointment => appointment.doctor === doctorName);
  }

  updateAppointment(updatedAppointment: Appointment) {
    this.appointments.update(appointments => 
      appointments.map(appointment => 
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment
      )
    );
  }
}
