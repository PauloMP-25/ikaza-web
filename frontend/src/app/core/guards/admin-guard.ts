import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';

// Guard para proteger rutas de administrador
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
                    return true;
                } else if (user && !user.isAdmin) {
                    // Usuario autenticado pero no es admin, redirigir al panel de usuario
                    this.router.navigate(['/panel-usuario']);
                    return false;
                } else {
                    // Usuario no autenticado, redirigir al inicio
                    this.router.navigate(['/home']);
                    return false;
                }
            })
        );
    }
}