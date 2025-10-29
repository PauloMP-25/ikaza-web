// src/app/core/guards/auth-checkout.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { TokenService } from '@core/services/auth/token.service';
import { CartService } from '@core/services/carrito/cart';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { catchError, map, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * ============================================================================
 * authCheckoutGuard - Validación completa para checkout
 * ============================================================================
 * Verifica:
 * - Usuario autenticado
 * - Token válido y no expirado
 * - Carrito con productos
 * - Perfil de cliente completo
 * ============================================================================
 */
export const authCheckoutGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const tokenService = inject(TokenService);
    const cartService = inject(CartService);
    const clienteService = inject(ClienteService);
    const router = inject(Router);

    const enableLogs = environment.enableAuthLogs || false;

    if (enableLogs) {
        console.log('🛡️ Checkout Guard: Validando acceso a', state.url);
    }

    return authService.isAuthenticated$().pipe(
        switchMap(isAuthenticated => {
            // ============================================================
            // PASO 1: Verificar si hay usuario autenticado
            // ============================================================
            if (!isAuthenticated) {
                if (enableLogs) {
                    console.warn('⚠️ Checkout Guard: Usuario no autenticado');
                }

                authService.setRedirectUrl(state.url);
                router.navigate(['/login'], {
                    queryParams: {
                        returnUrl: state.url,
                        message: 'Debes iniciar sesión para continuar con tu compra',
                        display: 'modal'
                    }
                });

                return of(false);
            }

            // ============================================================
            // PASO 2: Validar token y su expiración
            // ============================================================
            const token = tokenService.getToken();

            if (!token) {
                console.error('❌ Checkout Guard: No hay token');
                authService.logout();
                router.navigate(['/login'], {
                    queryParams: {
                        returnUrl: state.url,
                        message: 'Tu sesión ha expirado'
                    }
                });
                return of(false);
            }

            // Verificar si el token está expirado
            if (tokenService.isTokenExpired(token)) {
                console.error('❌ Checkout Guard: Token expirado');

                // Intentar renovar el token
                return authService.refreshToken().pipe(
                    switchMap(() => {
                        console.log('✅ Token renovado, continuando con validación...');
                        return continueCheckoutValidation(
                            authService,
                            cartService,
                            clienteService,
                            router,
                            state,
                            enableLogs
                        );
                    }),
                    catchError(error => {
                        console.error('❌ Error renovando token:', error);
                        authService.logout();
                        router.navigate(['/login'], {
                            queryParams: {
                                returnUrl: state.url,
                                message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
                            }
                        });
                        return of(false);
                    })
                );
            }

            // Token válido, verificar tiempo restante
            const minutesRemaining = tokenService.getTokenRemainingTime(token);

            if (minutesRemaining < 5) {
                console.warn(`⚠️ Token expirará pronto: ${minutesRemaining} minutos`);

                // Intentar renovar en background (no bloquear el flujo)
                authService.refreshToken().subscribe({
                    next: () => console.log('✅ Token renovado preventivamente'),
                    error: (err) => console.warn('⚠️ No se pudo renovar token:', err)
                });
            }

            if (enableLogs) {
                console.log(`✅ Token válido (${minutesRemaining}min restantes)`);
            }

            // ============================================================
            // PASO 3: Continuar con validaciones de checkout
            // ============================================================
            return continueCheckoutValidation(
                authService,
                cartService,
                clienteService,
                router,
                state,
                enableLogs
            );
        }),
        catchError((error) => {
            console.error('❌ Error crítico en Checkout Guard:', error);
            router.navigate(['/home']);
            return of(false);
        })
    );
};

/**
 * ============================================================================
 * Función auxiliar para continuar con validaciones de checkout
 * ============================================================================
 */
function continueCheckoutValidation(
    authService: AuthService,
    cartService: CartService,
    clienteService: ClienteService,
    router: Router,
    state: any,
    enableLogs: boolean
) {
    return authService.getCurrentUser$().pipe(
        switchMap(currentUser => {
            if (!currentUser) {
                console.error('❌ Checkout Guard: Usuario no encontrado');
                router.navigate(['/login']);
                return of(false);
            }

            // ============================================================
            // PASO 4: Verificar que el carrito tenga productos
            // ============================================================
            const cartItems = cartService.getCartItems();

            if (!cartItems || cartItems.length === 0) {
                console.warn('⚠️ Checkout Guard: Carrito vacío');
                router.navigate(['/catalogo'], {
                    queryParams: {
                        message: 'Tu carrito está vacío. Agrega productos antes de continuar.'
                    }
                });
                return of(false);
            }

            if (enableLogs) {
                console.log(`Carrito válido (${cartItems.length} productos)`);
            }

            // ============================================================
            // PASO 5: Verificar perfil del cliente
            // ============================================================
            return clienteService.obtenerPerfil(currentUser.email).pipe(
                map((cliente) => {
                    if (!cliente.datosCompletos) {
                        console.warn('⚠️ Checkout Guard: Datos de perfil incompletos');
                        router.navigate(['/panel-usuario/datos-personales'], {
                            queryParams: {
                                message: 'Completa tu información de perfil antes de continuar con la compra.',
                                returnUrl: state.url
                            }
                        });
                        return false;
                    }

                    if (enableLogs) {
                        console.log('Perfil del cliente verificado');
                        console.log('Checkout Guard: Acceso permitido');
                    }

                    return true;
                }),
                catchError((error) => {
                    console.error('Checkout Guard: Error al obtener perfil:', error);
                    
                    // Si el perfil no existe, crear uno inicial
                    if (error.status === 404) {
                        router.navigate(['/panel-usuario/datos-personales'], {
                            queryParams: {
                                message: 'Completa tu información de perfil para continuar.',
                                returnUrl: state.url
                            }
                        });
                    } else {
                        router.navigate(['/home'], {
                            queryParams: {
                                message: 'Ocurrió un error. Por favor, intenta nuevamente.'
                            }
                        });
                    }

                    return of(false);
                })
            );
        })
    );
}