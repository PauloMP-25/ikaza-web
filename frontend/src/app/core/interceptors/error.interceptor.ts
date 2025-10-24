import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * 🆕 INTERCEPTOR SEPARADO para manejo de errores de respuesta
 * Este interceptor solo se encarga de manejar errores HTTP
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            console.error('❌ Error HTTP interceptado:', error);

            if (error.status === 401) {
                console.error('❌ 401 Unauthorized - Token inválido o expirado');

                // Limpiar datos locales
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');

                // Redirigir a login
                router.navigate(['/login'], {
                    queryParams: {
                        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                        display: 'modal'
                    }
                });
            } else if (error.status === 403) {
                console.error('❌ 403 Forbidden - No tienes permisos');

                // Mostrar mensaje de error (podrías usar un servicio de notificaciones)
                console.warn('No tienes permisos para acceder a este recurso');

                // Opcional: redirigir según el contexto
                // router.navigate(['/']);
            }

            // Re-lanzar el error para que el componente lo maneje
            return throwError(() => error);
        })
    );
};