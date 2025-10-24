// src/app/core/guards/auth-guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';

/**
 * Guard que protege rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige a la página de login
 * con un query param para forzar la apertura del modal.
 */
export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si el usuario está autenticado
  if (authService.isAuthenticated()) {
    return true;
  }

  // Usuario no autenticado
  console.log('🔒 Usuario no autenticado, redirigiendo al login...');
  console.log('📍 URL solicitada:', state.url);

  // Guardar la URL solicitada para redirigir después del login
  // Se usa el servicio para guardar la URL y también se pasa en query params
  const returnUrl = state.url.startsWith('/') ? state.url.substring(1) : state.url;
  authService.setRedirectUrl(returnUrl);

  // Redirigir al login con los query params, incluyendo la instrucción para el modal
  router.navigate(['/login'], {
    queryParams: {
      returnUrl: state.url,
      message: 'Debes iniciar sesión para continuar',
      display: 'modal' // ✅ Instrucción para abrir el modal
    }
  });

  return false;
};