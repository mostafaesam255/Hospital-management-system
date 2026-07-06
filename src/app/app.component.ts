import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container.component';

@Component({
  selector: 'app-root',
  template: `<router-outlet /><app-toast-container />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastContainerComponent]
})
export class AppComponent {}
