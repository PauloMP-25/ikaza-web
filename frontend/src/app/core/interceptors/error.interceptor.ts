/**
 * ============================================================================
 * errorInterceptor v2.0 - Interceptor de Manejo de Errores
 * ============================================================================
 * - Intercepta errores HTTP de las respuestas
 * - Maneja específicamente errores 401 (Unauthorized) y 403 (Forbidden)
 * - Cierra sesión automáticamente en caso de 401
 * - Redirige al login con mensajes apropiados
 * CÓDIGOS DE ERROR MANEJADOS:
 *    - 401 Unauthorized: Token inválido o expirado → Logout + Redirect
 *    - 403 Forbidden: Sin permisos → Warning (sin logout)
 *    - Otros: Re-lanzar error para manejo en componente
 * 
 * FLUJO DE MANEJO:
 *    1. Interceptar error HTTP
 *    2. Identificar tipo de error (401, 403, otros)
 *    3. Ejecutar acción apropiada (logout, warning, etc.)
 *    4. Redirigir si es necesario
 *    5. Re-lanzar error para que el componente lo maneje
 * ============================================================================
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            console.error('❌ Error HTTP interceptado:', {
                status: error.status,
                statusText: error.statusText,
                url: error.url,
                message: error.message
            });

            // ============================================================
            // CASO 1: 401 Unauthorized (Token inválido o expirado)
            // ============================================================
            if (error.status === 401) {
                console.error('401 Unauthorized - Token inválido o expirado');
                console.log('Cerrando sesión y redirigiendo al login...');

                // Cerrar sesión usando el método del AuthService
                authService.logout().subscribe({
                    next: () => {
                        console.log('Sesión cerrada correctamente');
                        //Redirigir al login con mensaje
                        router.navigate(['/login'], {
                            queryParams: {
                                message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                                display: 'modal'
                            }
                        });
                    },
                    error: (logoutError) => {
                        console.error('Error al cerrar sesión:', logoutError);
                        // Forzar redirección incluso si el logout falla
                        router.navigate(['/login'], {
                            queryParams: {
                                message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                            }
                        });
                    }
                });
            }

            // ============================================================
            // CASO 2: 403 Forbidden (Sin permisos)
            // ============================================================
            else if (error.status === 403) {
                console.error('403 Forbidden - No tienes permisos para acceder a este recurso');
                
                // Mostrar mensaje de error (podrías usar un servicio de notificaciones)
                console.warn('Acceso denegado: No tienes permisos suficientes');
                
                router.navigate(['/home']);
            }

            // ============================================================
            // CASO 3: Otros errores HTTP
            // ============================================================
            else {
                console.error(`❌ Error HTTP ${error.status}:`, error.message);
            }

            // ============================================================
            // Re-lanzar el error para que el componente lo maneje
            // ============================================================
            return throwError(() => error);
        })
    );
};