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
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth);
    const router = inject(Router);

    console.log('🔄 Interceptor ejecutándose para:', req.url);

    // Solo aplicar el interceptor a peticiones del backend Spring Boot
    const isBackendRequest = req.url.includes('localhost:8080') ||
        req.url.includes('api/');

    if (!isBackendRequest) {
        console.log('🔄 Request no es del backend, continuando sin token');
        return next(req);
    }

    // Verificar si hay un usuario autenticado en Firebase
    const currentUser = auth.currentUser;

    if (!currentUser) {
        console.log('👤 No hay usuario autenticado, continuando sin token');
        return next(req);
    }

    // Obtener el token de Firebase y agregarlo al header Authorization
    return from(currentUser.getIdToken()).pipe(
        switchMap(token => {
            if (!token) {
                console.warn('⚠️ Token es null/undefined, continuando sin token');
                return next(req);
            }

            const clonedRequest = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('🔑 ID Token agregado a:', req.url);
            return next(clonedRequest);
        }),
        catchError((error: any) => {
            console.error('❌ Error obteniendo ID token de Firebase:', error);
            return next(req);
        })
    );
};