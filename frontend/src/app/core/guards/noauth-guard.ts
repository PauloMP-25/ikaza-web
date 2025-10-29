/**
 * ============================================================================
 * NoAuthGuard - Impide que usuarios autenticados accedan a login/registro
 * ============================================================================
 * - Si el usuario está logueado, lo redirige a su panel
 * - Si no está logueado, permite el acceso
 * ============================================================================
 */
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';
@Injectable({
    providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        return this.authService.user$.pipe(
            take(1),
            map(user => {
                if (user) {
                    console.log('No Auth Guard: Usuario ya autenticado, redirigiendo a panel...');
                    if (user.isAdmin) {
                        this.router.navigate(['/panel-administrador']);
                    } else {
                        this.router.navigate(['/panel-usuario']);
                    }
                    return false;
                } else {
                    console.log('No Auth Guard: Usuario no autenticado, acceso permitido');
                    return true;
                }
            })
        );
    }
}