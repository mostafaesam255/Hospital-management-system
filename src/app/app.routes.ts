import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'lookup',
    loadComponent: () => import('./patient-lookup/patient-lookup.component').then(m => m.PatientLookupComponent)
  },
  {
    path: '',
    loadComponent: () => import('./main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'admin',
        loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'admin-analytics',
        loadComponent: () => import('./admin-analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent)
      },
      {
        path: 'receptionist-dashboard',
        loadComponent: () => import('./receptionist-dashboard/receptionist-dashboard.component').then(m => m.ReceptionistDashboardComponent)
      },
      {
        path: 'nurse-dashboard',
        loadComponent: () => import('./nurse-dashboard/nurse-dashboard.component').then(m => m.NurseDashboardComponent)
      },
      {
        path: 'doctor-dashboard',
        loadComponent: () => import('./doctor-dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent)
      },
      {
        path: 'pharmacy-dashboard',
        loadComponent: () => import('./pharmacy-dashboard/pharmacy-dashboard.component').then(m => m.PharmacyDashboardComponent)
      },
      {
        path: 'investigation-dashboard',
        loadComponent: () => import('./investigation-dashboard/investigation-dashboard.component').then(m => m.InvestigationDashboardComponent)
      },
      {
        path: 'accountant-dashboard',
        loadComponent: () => import('./accountant-dashboard/accountant-dashboard.component').then(m => m.AccountantDashboardComponent)
      },
      {
        path: 'billing',
        loadComponent: () => import('./billing-dashboard/billing-dashboard').then(m => m.BillingDashboardComponent)
      },
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
