import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast show" [ngClass]="{'bg-success': toast.type === 'success', 'bg-danger': toast.type === 'error'}">
          <div class="toast-body">
            {{ toast.message }}
            <button type="button" class="btn-close" (click)="toastService.remove(toast.id)"></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      z-index: 1200;
    }
    .toast {
      border: none;
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toast-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
