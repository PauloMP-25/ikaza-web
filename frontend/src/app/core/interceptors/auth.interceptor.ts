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

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap, catchError} from 'rxjs';
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
            if (token) {
                const clonedRequest = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('Token agregado a la petición:', req.url);
                return next(clonedRequest);
            }

            // Si no hay token, continuar sin Authorization header
            console.warn('No hay token disponible, continuando sin Authorization header');
            return next(req);
        }),
        catchError((error) => {
            // Error obteniendo el token (poco probable con getIdToken$)
            console.error('Error obteniendo token:', error);

            // Continuar la petición sin token
            // El backend rechazará la petición si requiere autenticación
            console.warn('Continuando petición sin token debido a error');
            return next(req);
        })
    );
};