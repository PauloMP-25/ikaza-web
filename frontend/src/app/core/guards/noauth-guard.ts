import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { map, take } from 'rxjs';

/**
 * ============================================================================
 * NO AUTH GUARD - Impide que usuarios autenticados accedan a login/registro
 * ============================================================================
 */
export const NoAuthGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.user$.pipe(
        take(1),
        map(user => {
            if (user) {
                console.log('⚠️ NoAuth Guard: Usuario ya autenticado');
                if (user.isAdmin) {
                    router.navigate(['/panel-administrador']);
                } else {
                    router.navigate(['/panel-usuario']);
                }
                return false;
            }

            console.log('✅ NoAuth Guard: Acceso permitido');
            return true;
        })
    );
};