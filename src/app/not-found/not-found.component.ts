import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="page-wrapper">

      <!-- Floating particles -->
      <div class="particles">
        @for (p of particles; track p.id) {
          <div class="particle" [style]="p.style"></div>
        }
      </div>

      <!-- Main content -->
      <div class="content">

        <!-- Glitching 404 -->
        <div class="error-code" aria-hidden="true">
          <span class="digit" data-text="4">4</span>
          <span class="digit zero" data-text="0">0</span>
          <span class="digit" data-text="4">4</span>
        </div>

        <!-- Pulse ring behind the zero -->
        <div class="pulse-rings">
          <span></span><span></span><span></span>
        </div>

        <!-- Message -->
        <div class="message-block">
          <h1 class="title">Page Not Found</h1>
          <p class="subtitle">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <!-- Countdown -->
        <div class="countdown-block">
          <span class="countdown-label">Redirecting to login in</span>
          <span class="countdown-timer">{{ countdown() }}s</span>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn-home" (click)="goHome()">
            <span class="btn-icon">🏥</span>
            Back to Login
          </button>
        </div>

        <!-- Decorative grid lines -->
        <div class="grid-lines" aria-hidden="true">
          <div class="h-line"></div>
          <div class="h-line"></div>
          <div class="v-line"></div>
          <div class="v-line"></div>
        </div>

      </div>
    </div>
  `,
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent implements OnInit, OnDestroy {
  public countdown = signal(10);
  private timer?: ReturnType<typeof setInterval>;

  // Generate random floating particles
  public particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    style: `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${4 + Math.random() * 6}px;
      height: ${4 + Math.random() * 6}px;
      animation-delay: ${Math.random() * 6}s;
      animation-duration: ${6 + Math.random() * 8}s;
      opacity: ${0.15 + Math.random() * 0.35};
    `
  }));

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.countdown.update(v => {
        if (v <= 1) {
          clearInterval(this.timer);
          this.router.navigate(['/login']);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  goHome(): void {
    clearInterval(this.timer);
    this.router.navigate(['/login']);
  }
}
