/**
 * ============================================================================
 * Interceptor de Autenticación Reactivo
 * ============================================================================
 * - Agrega el token de Firebase a todas las peticiones del backend
 * - Obtiene el token de forma reactiva usando AuthService.getIdToken$()
 * - Solo aplica a peticiones del backend (localhost:8080 o /api/)
 * SEGURIDAD:
 *    - Si no hay token, la petición continúa sin Authorization header
 *    - El backend debe validar y rechazar peticiones sin token
 *    - No se exponen errores sensibles al cliente
 * LOGS:
 *    - Logs informativos de cada petición interceptada
 *    - Identificación clara de peticiones con/sin token
 *    - Logs de errores sin exponer información sensible
 * ============================================================================
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log('Auth Interceptor ejecutándose para:', req.url);

    // ============================================================
    // PASO 1: Filtrar solo peticiones del backend
    // ============================================================
    const isBackendRequest = req.url.includes('localhost:8080') || req.url.includes('/api/');

    if (!isBackendRequest) {
        console.log('Request externa (no backend), continuando sin token');
        return next(req);
    }

    // ============================================================
    // PASO 2: Obtener token de forma reactiva usando AuthService
    // ============================================================
    return authService.getIdToken$().pipe(
        switchMap(token => {
            // Si hay token, agregarlo a los headers
            let clonedRequest = req;
            if (token) {
                clonedRequest = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('Token agregado a la petición:', req.url);
            } else {
                // Si no hay token, la petición continúa sin Authorization header
                console.warn('No hay token disponible, continuando sin Authorization header');
            }
            // ============================================================
            // PASO 3: Enviar la petición y manejar errores de respuesta
            // ============================================================
            return next(clonedRequest).pipe(
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 401) {
                        console.error('❌ 401 Unauthorized: Token inválido o expirado en el backend.', req.url);
                        // Desencadenar el logout completo (Firebase + app state + redirección)
                        // Esto garantiza que la sesión se limpie completamente.
                        authService.logout().subscribe({
                            error: (logoutError) => console.error('Error durante el logout forzado:', logoutError)
                        });
                        // Lanza el error para que la lógica de manejo de errores del componente lo reciba
                        return throwError(() => new Error('Sesión expirada o inválida.'));
                    }

                    if (error.status === 403) {
                        console.error('❌ 403 Forbidden: No tiene permisos para esta acción.', req.url);
                    }

                    // Lanza otros errores HTTP
                    return throwError(() => error);
                })
            );
        }),
        catchError((tokenError) => {
            // Error obteniendo el token (poco probable con getIdToken$)
            console.error('Error fatal al obtener token:', tokenError);
            console.warn('Continuando petición SIN token debido a error de obtención.');
            // Permitir que la petición original (sin token) pase para que el backend la rechace si es necesario
            return next(req);
        })
    );
}