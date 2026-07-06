import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../shared/services/theme.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterLink,
    RouterOutlet
  ]
})
export class MainLayoutComponent {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
}
