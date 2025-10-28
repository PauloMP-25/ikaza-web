/**
 * ============================================================================
 * AuthGuard - Protege rutas que requieren autenticación
 * ============================================================================
 * - Verifica si el usuario está autenticado
 * - Si no lo está, guarda la URL solicitada
 * - Redirige al login con mensaje
 * ============================================================================
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { map } from 'rxjs';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        console.log('Auth Guard: Usuario autenticado, acceso permitido');
        return true;
      }

      console.warn('Auth Guard: Usuario no autenticado, redirigiendo al login...');
      console.log('URL solicitada:', state.url);

      const returnUrl = state.url.startsWith('/') ? state.url.substring(1) : state.url;
      authService.setRedirectUrl(returnUrl);

      router.navigate(['/login'], {
        queryParams: {
          returnUrl: state.url,
          message: 'Primero debes iniciar sesión para continuar',
          display: 'modal'
        }
      });

      return false;
    })
  );
};