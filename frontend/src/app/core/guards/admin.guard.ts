/**
 * ============================================================================
 * AdminGuard - Protege rutas exclusivas del administrador
 * ============================================================================
 * - Verifica si el usuario está autenticado
 * - Verifica si el usuario tiene rol de administrador
 * - Redirige según el caso:
 *  • Admin → permite acceso
 *  • Usuario normal → redirige a /panel-usuario
 *  • No autenticado → redirige a /home
 * ============================================================================
 */

import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';
@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        return this.authService.user$.pipe(
            take(1),
            map(user => {
                if (user && user.isAdmin) {
                    console.log('Admin Guard: Acceso permitido');
                    return true;
                } else if (user && !user.isAdmin) {
                    console.warn('Admin Guard: Usuario no es admin, redirigiendo...');
                    this.router.navigate(['/panel-usuario']);
                    return false;
                } else {
                    console.warn('Admin Guard: Usuario no autenticado, redirigiendo...');
                    this.router.navigate(['/home']);
                    return false;
                }
            })
        );
    }
}