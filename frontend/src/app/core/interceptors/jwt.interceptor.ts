// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { TokenService } from '@core/services/auth/token.service';
import { AuthService } from '@core/services/auth/auth';

/**
 * ============================================================================
 * INTERCEPTOR JWT
 * ============================================================================
 * - Agrega token JWT a requests protegidos
 * - Identifica endpoints públicos
 * - Maneja errores 401/403
 * - Intenta renovar token si expira
 * ============================================================================
 */

// Endpoints públicos (no requieren token)
const PUBLIC_ENDPOINTS = [
    '/api/auth/registro',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/verificar-email',
    '/api/public',
    '/api/google-maps',
    '/api/categorias'
];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar si es request del backend
    const isBackendRequest = req.url.includes('localhost:8080') || req.url.includes('/api/');

    if (!isBackendRequest) {
        return next(req);
    }

    // Verificar si es endpoint público
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => req.url.includes(endpoint));

    if (isPublicEndpoint) {
        return next(req);
    }

    // Obtener token
    const token = tokenService.getToken();

    // Si no hay token, continuar sin él (el backend rechazará si es necesario)
    if (!token) {
        console.warn('⚠️ No hay token disponible para endpoint protegido');
        return next(req);
    }

    // Verificar si el token está expirado
    if (tokenService.isTokenExpired(token)) {
        console.warn('⚠️ Token expirado, intentando renovar...');

        // Intentar renovar el token
        return authService.refreshToken().pipe(
            switchMap(newToken => {
                // Clonar request con nuevo token
                const clonedRequest = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${newToken}`
                    }
                });
                return next(clonedRequest);
            }),
            catchError(error => {
                // Si falla la renovación, logout y redirigir
                console.error('❌ Error renovando token, cerrando sesión');
                authService.logout();
                router.navigate(['/login']);
                return throwError(() => error);
            })
        );
    }

    // Clonar request con token
    const clonedRequest = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    // Enviar request y manejar errores
    return next(clonedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            // Manejar 401 (No autenticado)
            if (error.status === 401) {
                console.error('❌ 401: Sesión expirada');
                authService.logout().subscribe();
                router.navigate(['/login'], {
                    queryParams: { message: 'Tu sesión ha expirado' }
                });
            }

            // Manejar 403 (Sin permisos)
            if (error.status === 403) {
                console.error('❌ 403: Sin permisos');
                router.navigate(['/home']);
            }

            return throwError(() => error);
        })
    );
};