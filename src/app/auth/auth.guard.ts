import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (currentUser) {
    const targetPath = state.url;
    const userDashboard = currentUser.role === 'admin' ? '/admin' : `/${currentUser.role}-dashboard`;

    if (targetPath === '/login') {
      router.navigateByUrl(userDashboard);
      return false;
    }
    
    return true;
  } else {
    if (state.url !== '/login') {
      router.navigate(['/login']);
      return false;
    }
    return true;
  }
};