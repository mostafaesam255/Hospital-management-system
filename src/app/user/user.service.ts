import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './user.model';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  public users = signal<User[]>([]);
  public isLoading = signal(false);
  public currentUser = this.authService.currentUser;

  private pollingIntervalId: any = null;

  constructor() {
    this.loadUsers();
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollingIntervalId) return;
    this.pollingIntervalId = setInterval(async () => {
      if (this.authService.currentUser() && !this.isLoading()) {
        await this.loadUsers(true);
      }
    }, 30000);
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

  // ✅ جيب كل الـ Users من الـ Backend (معدل للعمل محلياً)
  async loadUsers(silent: boolean = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    try {
      let usersList: User[] = [];
      const storedUsers = localStorage.getItem('hms_users');
      if (!storedUsers) {
        const defaultUsers = [
          { id: 'u1', name: 'System Admin', username: 'admin@gmail.com', password: 'Admin123!', role: 'admin', clinicId: null },
          { id: 'u2', name: 'Dr. Ahmad neurology', username: 'doctor@gmail.com', password: 'Password123!', role: 'doctor', clinicId: 'c1' },
          { id: 'u3', name: 'Nurse Fatma', username: 'nurse@gmail.com', password: 'Password123!', role: 'nurse', clinicId: 'c1' },
          { id: 'u4', name: 'Receptionist Sarah', username: 'receptionist@gmail.com', password: 'Password123!', role: 'receptionist', clinicId: null },
          { id: 'u5', name: 'Pharmacist Aly', username: 'pharmacy@gmail.com', password: 'Password123!', role: 'pharmacy', clinicId: null },
          { id: 'u6', name: 'Lab Tech Omar', username: 'lab@gmail.com', password: 'Password123!', role: 'investigation', clinicId: null },
          { id: 'u7', name: 'Accountant Sherif', username: 'accountant@gmail.com', password: 'Password123!', role: 'accountant', clinicId: null }
        ];
        localStorage.setItem('hms_users', JSON.stringify(defaultUsers));
        usersList = defaultUsers as any[];
      } else {
        usersList = JSON.parse(storedUsers);
      }
      
      const currentData = JSON.stringify(this.users());
      const newData = JSON.stringify(usersList);
      if (currentData !== newData) {
        this.users.set(usersList);
      }

      // ✅ تحديث بيانات المستخدم الحالي لو الـ clinicId ناقصة في الـ Session
      const current = this.authService.currentUser();
      if (current && current.clinicId == null) {
        const found = usersList.find(u => String(u.id) === String(current.id));
        if (found && found.clinicId != null) {
          const enriched = { ...current, clinicId: found.clinicId };
          this.authService.currentUser.set(enriched);
          localStorage.setItem('hms_user', JSON.stringify(enriched));
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      if (!silent) this.isLoading.set(false);
    }
  }

  // ✅ أضف User جديد - معدل محلياً
  async addUser(user: Omit<User, 'id'>): Promise<void> {
    try {
      const password = (user as any).password || 'Password123!';
      const storedUsers = localStorage.getItem('hms_users');
      const usersList: any[] = storedUsers ? JSON.parse(storedUsers) : [];

      const newUser = {
        id: 'u_' + Math.random().toString(36).substring(2, 9),
        name: user.name,
        username: user.username,
        role: user.role,
        clinicId: user.clinicId || null,
        password: password
      };

      usersList.push(newUser);
      localStorage.setItem('hms_users', JSON.stringify(usersList));

      if (user.clinicId) {
        const clinicMap: Record<string, string> = JSON.parse(localStorage.getItem('hms_user_clinic_map') || '{}');
        clinicMap[String(newUser.id)] = String(user.clinicId);
        localStorage.setItem('hms_user_clinic_map', JSON.stringify(clinicMap));
      }

      await this.loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
    }
  }


  // ✅ احذف User - معدل محلياً
  async deleteUser(id: string): Promise<void> {
    try {
      const storedUsers = localStorage.getItem('hms_users');
      let usersList: User[] = storedUsers ? JSON.parse(storedUsers) : [];

      usersList = usersList.filter(u => String(u.id) !== String(id));
      localStorage.setItem('hms_users', JSON.stringify(usersList));

      await this.loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
    }
  }

  // ✅ عدّل User - معدل محلياً
  async updateUser(updatedUser: User): Promise<void> {
    try {
      const storedUsers = localStorage.getItem('hms_users');
      let usersList: any[] = storedUsers ? JSON.parse(storedUsers) : [];

      usersList = usersList.map(u => {
        if (String(u.id) === String(updatedUser.id)) {
          return {
            ...u,
            name: updatedUser.name,
            username: updatedUser.username,
            role: updatedUser.role,
            clinicId: updatedUser.clinicId || null,
            password: (updatedUser as any).password || u.password
          };
        }
        return u;
      });

      localStorage.setItem('hms_users', JSON.stringify(usersList));

      if (updatedUser.clinicId) {
        const clinicMap: Record<string, string> = JSON.parse(localStorage.getItem('hms_user_clinic_map') || '{}');
        clinicMap[String(updatedUser.id)] = String(updatedUser.clinicId);
        localStorage.setItem('hms_user_clinic_map', JSON.stringify(clinicMap));
      }

      await this.loadUsers();
      
      const current = this.authService.currentUser();
      if (current && String(current.id) === String(updatedUser.id)) {
        const sessionUser = { ...current, ...updatedUser };
        this.authService.currentUser.set(sessionUser);
        localStorage.setItem('hms_user', JSON.stringify(sessionUser));
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  getUsers() {
    return this.users();
  }

  // ✅ تحويل الـ Role من Backend للـ Frontend
  private mapRole(role: string): User['role'] {
    const map: { [key: string]: string } = {
      'Admin': 'admin',
      'Doctor': 'doctor',
      'Nurse': 'nurse',
      'Receptionist': 'receptionist',
      'Pharmacy': 'pharmacy',
      'Lab': 'investigation',
      'Investigation': 'investigation',
      'Accountant': 'accountant'
    };
    return (map[role] || role?.toLowerCase()) as User['role'];
  }

  // ✅ تحويل الـ Role من Frontend للـ Backend
  private reverseMapRole(role: string): string {
    const map: { [key: string]: string } = {
      'admin': 'Admin',
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'receptionist': 'Receptionist',
      'pharmacy': 'Pharmacy',
      'investigation': 'Lab',
      'accountant': 'Accountant'
    };
    return map[role] || role;
  }
}