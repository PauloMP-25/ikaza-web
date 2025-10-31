// src/app/core/guards/auth.guards.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { TokenService } from '@core/services/auth/token.service';
import { map, take } from 'rxjs';

/**
 * ============================================================================
 * AUTH GUARD - Protege rutas que requieren autenticación
 * ============================================================================
 */
export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  return authService.isAuthenticated$().pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        // Verificar que el token no esté expirado
        const token = tokenService.getToken();
        if (token && !tokenService.isTokenExpired(token)) {
          console.log("token : " ,token)
          console.log('✅ Auth Guard: Acceso permitido');
          return true;
        }
      }

      console.warn('⚠️ Auth Guard: No autenticado, redirigiendo al login');
      authService.setRedirectUrl(state.url);

      router.navigate(['/login'], {
        queryParams: {
          returnUrl: state.url,
          message: 'Debes iniciar sesión para continuar'
        }
      });

      return false;
    })
  );
};