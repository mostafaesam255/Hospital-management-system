
import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: ToastType = 'success') {
    const newToast: Toast = {
      id: this.nextId++,
      message,
      type,
    };
    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    setTimeout(() => this.remove(newToast.id), 5000); // Auto-dismiss after 5 seconds
  }

  remove(id: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}
