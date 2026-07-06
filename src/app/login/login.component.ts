import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, RouterLink],
})
export class LoginComponent {
  public authService = inject(AuthService);

  public email = '';
  public password = '';

  async login(): Promise<void> {
    if (!this.email || !this.password) return;
    await this.authService.login(this.email, this.password);
  }
}