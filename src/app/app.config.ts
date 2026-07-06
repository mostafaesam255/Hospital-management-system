import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { authInterceptor } from './shared/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    // ✅ HttpClient مع الـ Interceptor
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};