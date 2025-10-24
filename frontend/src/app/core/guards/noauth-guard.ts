import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';

// Guard para prevenir que usuarios logueados accedan a páginas de login
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
                    // Si el usuario está logueado, redirigir según su rol
                    if (user.isAdmin) {
                        this.router.navigate(['/admin']);
                    } else {
                        this.router.navigate(['/panel-usuario']);
                    }
                    return false;
                } else {
                    return true;
                }
            })
        );
    }
}