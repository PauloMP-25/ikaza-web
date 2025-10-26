// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError, of } from 'rxjs';

/**
 * Interceptor que agrega el token de Firebase a las peticiones
 * y maneja errores de autenticación (401, 403)
 */
/**
 * Interceptor que agrega el token de Firebase a las peticiones
 * y maneja errores de autenticación (401, 403)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);
    const router = inject(Router);

    console.log('🔄 Interceptor ejecutándose para:', req.url);

    const isBackendRequest = req.url.includes('localhost:8080') || req.url.includes('api/');

    if (!isBackendRequest) {
        console.log('🔄 Request no es del backend, continuando sin token');
        return next(req);
    }

    const currentUser = auth.currentUser;
    const localToken = localStorage.getItem('authToken');

    // 🚨 PASO 1: Si NO hay usuario logueado, usar el token de localStorage como fallback.
    if (!currentUser) {
        if (localToken) {
            console.log('🔑 Usando token de localStorage (Fallback)');
            const clonedRequest = req.clone({
                setHeaders: { Authorization: `Bearer ${localToken}` }
            });
            return next(clonedRequest);
        }
        console.log('👤 No hay usuario autenticado ni token local, continuando sin token');
        return next(req);
    }

    // 🚨 PASO 2: Usuario logueado. Obtener el token de Firebase (Asíncrono)
    return from(currentUser.getIdToken()).pipe(
        switchMap(firebaseToken => {
            // Usar el token de Firebase si está disponible, sino el token local (si aún existe)
            const finalToken = firebaseToken || localToken;

            if (finalToken) {
                const clonedRequest = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${finalToken}` // Aquí finalToken ya es string
                    }
                });
                console.log('🔑 ID Token agregado a:', req.url);
                return next(clonedRequest);
            }

            console.warn('⚠️ No se pudo obtener el token, continuando sin Authorization.');
            return next(req); // Continúa sin cabecera si el token es nulo
        }),
        catchError((error: any) => {
            console.error('❌ Error obteniendo ID token de Firebase:', error);
            // Intentar usar token local como último recurso si hay un error
            if (localToken) {
                const clonedRequest = req.clone({
                    setHeaders: { Authorization: `Bearer ${localToken}` }
                });
                return next(clonedRequest);
            }
            return next(req);
        })
    );
};