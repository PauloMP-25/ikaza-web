/**
 * ============================================================================
 * authCheckoutGuard - Validación de sesión para checkout
 * ============================================================================
 * - Verifica que el usuario esté autenticado
 * - Valida que el token no esté expirado
 * - Si la sesión expiró, cierra sesión y redirige
 * ============================================================================
 */
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { catchError, map, of, switchMap } from 'rxjs';

export const authCheckoutGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isAuthenticated$().pipe(
        switchMap(isAuthenticated => {
            // ============================================================
            // PASO 1: Verificar si hay usuario autenticado
            // ============================================================
            if (!isAuthenticated) {
                console.warn('Auth Checkout Guard: Usuario no autenticado. Redirigiendo al login.');
                router.navigate(['/login'], {
                    queryParams: { message: 'Tu sesión ha expirado. Inicia sesión nuevamente.' }
                });
                return of(false);
            }

            // ============================================================
            // PASO 2: Validar token y su expiración
            // ============================================================
            return authService.getIdTokenResult$().pipe(
                map((tokenResult) => {
                    const expDate = new Date(tokenResult.expirationTime);
                    const now = new Date();

                    // Token expirado
                    if (expDate <= now) {
                        console.warn('Auth Checkout Guard: Token expirado. Cerrando sesión...');
                        authService.logout().subscribe();
                        router.navigate(['/login'], {
                            queryParams: { message: 'Tu sesión ha expirado. Vuelve a iniciar sesión.' }
                        });
                        return false;
                    }

                    // Token válido
                    console.log('Auth Checkout Guard: Token válido, acceso permitido.');
                    console.log(`Token expira en: ${Math.round((expDate.getTime() - now.getTime()) / 1000 / 60)} minutos`);
                    return true;
                }),
                catchError((error) => {
                    console.error('Auth Checkout Guard: Error validando token:', error);
                    authService.logout().subscribe();
                    router.navigate(['/login'], {
                        queryParams: { message: 'Ocurrió un error de sesión. Por favor inicia sesión nuevamente.' }
                    });
                    return of(false);
                })
            );
        })
    );
};