/**
 * ============================================================================
 * checkoutGuard - Protege la ruta de checkout
 * ============================================================================
 * - Verifica que el usuario esté autenticado
 * - Verifica que el carrito tenga productos
 * - Verifica que el perfil del cliente exista
 * - Verifica si el email está verificado (warning)
 * ============================================================================
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { CartService } from '@core/services/carrito/cart';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { catchError, map, of, switchMap } from 'rxjs';

export const checkoutGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const clienteService = inject(ClienteService);
    const cartService = inject(CartService);
    const router = inject(Router);

    return authService.getCurrentUser$().pipe(
        switchMap(currentUser => {
            // ============================================================
            // Verificar autenticación
            // ============================================================
            if (!currentUser) {
                console.warn('Checkout Guard: Usuario no autenticado. Redirigiendo a login...');
                authService.setRedirectUrl(state.url);
                router.navigate(['/login'], {
                    queryParams: {
                        returnUrl: state.url,
                        message: 'Debes iniciar sesión para proceder con la compra',
                        display: 'modal'
                    }
                });
                return of(false);
            }

            // ============================================================
            // Verificar carrito
            // ============================================================
            const cartItems = cartService.getCartItems();
            if (!cartItems || cartItems.length === 0) {
                console.warn('Checkout Guard: Carrito vacío. Redirigiendo al catálogo...');
                router.navigate(['/catalogo'], {
                    queryParams: {
                        message: 'Tu carrito está vacío. Agrega productos antes de continuar.'
                    }
                });
                return of(false);
            }

            // ============================================================
            // Verificar email verificado (warning, no bloquea)
            // ============================================================
            if (!currentUser.emailVerified) {
                console.warn('Checkout Guard: Email no verificado. Continuará con advertencia.');
                localStorage.setItem(
                    'checkoutWarning',
                    'Tu email no está verificado. Verifica tu correo para evitar problemas con tu pedido.'
                );
            }

            // ============================================================
            // Verificar perfil del cliente
            // ============================================================
            return clienteService.obtenerPerfil(currentUser.uid).pipe(
                map(() => {
                    console.log('Checkout Guard: Perfil del cliente verificado. Acceso permitido.');
                    return true;
                }),
                catchError((error) => {
                    console.error('Checkout Guard: Error al obtener perfil del cliente:', error);
                    router.navigate(['/panel-usuario/datos-personales'], {
                        queryParams: {
                            message: 'Completa tu información de perfil antes de continuar con la compra.'
                        }
                    });
                    return of(false);
                })
            );
        })
    );
};