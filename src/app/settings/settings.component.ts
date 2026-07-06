import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicService } from '../clinics/clinic.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SettingsComponent {
  public clinicService = inject(ClinicService);
  public userService = inject(UserService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  public user = computed(() => this.userService.currentUser());
  public loading = signal(false);
  public profilePicPreview = signal<string | null>(null);

  public newClinicForm = this.fb.group({ 
    name: ['', Validators.required], 
    description: ['', Validators.required] 
  });

  public userForm = this.fb.group({
    username: ['', Validators.required],
    password: [''],
    phone: [''],
    email: [''],
  });

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        this.userForm.patchValue({
          username: currentUser.username,
          phone: currentUser.phone || '',
          email: currentUser.email || ''
        });
        this.profilePicPreview.set(currentUser.profilePicUrl || null);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfile() {
    const currentUser = this.user();
    if (this.userForm.valid && currentUser) {
      this.loading.set(true);

      const updatedUser = {
        ...currentUser,
        ...this.userForm.getRawValue(),
        profilePicUrl: this.profilePicPreview() ?? currentUser.profilePicUrl,
      } as User;

      this.userService.updateUser(updatedUser);

      this.userForm.patchValue({ password: '' });

      setTimeout(() => {
        this.loading.set(false);
        this.toastService.show('Profile updated successfully! ✨', 'success');
      }, 1000);
    } else {
      this.toastService.show('Please fill the form correctly.', 'error');
    }
  }

  addClinic() {
    const newClinic = this.newClinicForm.value;
    if (newClinic.name && newClinic.description) {
      this.clinicService.addClinic({ 
        name: newClinic.name, 
        description: newClinic.description 
      });
      this.newClinicForm.reset();
      this.toastService.show('Clinic added successfully!', 'success');
    }
  }

  deleteClinic(id: string) {
    if (confirm('Are you sure you want to delete this clinic?')) {
      this.clinicService.deleteClinic(id);
      this.toastService.show('Clinic deleted.', 'success');
    }
  }
}
