import { ApplicationRef, Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../user/user.model';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private appRef = inject(ApplicationRef);
  private http = inject(HttpClient);

  // ✅ الـ Backend URL
  private apiUrl = environment.apiUrl;

  public currentUser = signal<User | null>(this.getInitialUser());
  public isLoading = signal(false);
  public loginError = signal<string | null>(null);

  constructor() {
    // مزامنة لو فتح تابين
    window.addEventListener('storage', (event) => {
      if (event.key === 'hms_user') {
        if (event.newValue) {
          this.currentUser.set(JSON.parse(event.newValue) as User);
        } else {
          this.currentUser.set(null);
          this.router.navigate(['/login']);
        }
        this.appRef.tick();
      }
    });
  }

  private getInitialUser(): User | null {
    try {
      const storedUser = localStorage.getItem('hms_user');
      if (!storedUser) return null;
      const user = JSON.parse(storedUser) as User;
      // ✅ لو الـ clinicId ناقصة، جيبها من الـ backup map
      if (user && user.clinicId == null && user.id) {
        const clinicMap: Record<string, string> = JSON.parse(localStorage.getItem('hms_user_clinic_map') || '{}');
        const backupClinicId = clinicMap[String(user.id)];
        if (backupClinicId) {
          user.clinicId = backupClinicId;
          // حدّث النسخة في الذاكرة
          localStorage.setItem('hms_user', JSON.stringify(user));
        }
      }
      return user;
    } catch {
      localStorage.removeItem('hms_user');
      return null;
    }
  }

  // ✅ Login بيكلم الـ Backend (معدل للعمل محلياً)
  async login(email: string, password: string): Promise<boolean> {
    this.isLoading.set(true);
    this.loginError.set(null);

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

      const matchedUser = usersList.find(
        u => u.username?.toLowerCase() === email.toLowerCase() && (u as any).password === password
      );

      if (matchedUser) {
        localStorage.setItem('hms_token', 'local_mock_token');
        localStorage.setItem('hms_user', JSON.stringify(matchedUser));
        this.currentUser.set(matchedUser);
        this.appRef.tick();
        this.navigateByRole(matchedUser.role);
        return true;
      }

      this.loginError.set('Invalid email or password.');
      return false;

    } catch (error: any) {
      console.error('Login error:', error);
      this.loginError.set('An error occurred during local validation.');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ✅ Navigation حسب الـ Role
  private navigateByRole(role: string): void {
    if (role === 'admin') {
      this.router.navigateByUrl('/admin');
    } else {
      this.router.navigateByUrl(`/${role}-dashboard`);
    }
  }

  // ✅ Logout
  logout() {
    localStorage.removeItem('hms_user');
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_refresh_token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ✅ جيب الـ Token عشان تبعته مع الـ Requests
  getToken(): string | null {
    return localStorage.getItem('hms_token');
  }
}