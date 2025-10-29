import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { map, take } from 'rxjs';
/**
 * ============================================================================
 * ADMIN GUARD - Protege rutas exclusivas del administrador
 * ============================================================================
 */

export const AdminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.user$.pipe(
        take(1),
        map(user => {
            if (user && user.isAdmin) {
                console.log('✅ Admin Guard: Acceso permitido');
                return true;
            } else if (user && !user.isAdmin) {
                console.warn('⚠️ Admin Guard: Usuario no es admin');
                router.navigate(['/panel-usuario']);
                return false;
            } else {
                console.warn('⚠️ Admin Guard: No autenticado');
                router.navigate(['/home']);
                return false;
            }
        })
    );
};