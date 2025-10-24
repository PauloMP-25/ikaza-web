// src/app/guards/checkout.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { CartService } from '@core/services/carrito/cart';

/**
 * Guard para proteger la ruta de checkout
 * Verifica que el usuario esté autenticado y tenga items en el carrito
 */
export const checkoutGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const cartService = inject(CartService);
    const router = inject(Router);

    // 1. Verificar si el usuario está autenticado
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
        console.warn('Usuario no autenticado, redirigiendo a login...');

        // Guardar la URL de destino para redirigir después del login
        authService.setRedirectUrl(state.url);

        // Mostrar mensaje al usuario (usando query params en lugar de localStorage es mejor)
        // localStorage.setItem('checkoutMessage', 'Debes iniciar sesión para proceder con la compra'); 
        // 👆 Esto lo podemos mover al queryParams, si el Login/Modal lo procesa.

        // Redirigir al login con la instrucción del modal
        router.navigate(['/auth/login'], { // ⚠️ Asumo que /auth/login es la ruta correcta
            queryParams: {
                returnUrl: state.url,
                message: 'Debes iniciar sesión para proceder con la compra', // 👈 Mensaje informativo
                display: 'modal' // 👈 NUEVO: Instrucción para abrir el modal
            }
        });

        return false;
    }

    // 2. Verificar si hay items en el carrito
    const cartItems = cartService.getCartItems();

    if (cartItems.length === 0) {
        console.warn('Carrito vacío, redirigiendo al catálogo...');

        // Mostrar mensaje
        localStorage.setItem('checkoutMessage', 'Tu carrito está vacío. Agrega productos antes de continuar.');

        // Redirigir al catálogo
        router.navigate(['/catalogo']);

        return false;
    }

    // 3. Verificar si el usuario tiene datos completos
    const firebaseUser = authService.getFirebaseCurrentUser();

    if (firebaseUser && !firebaseUser.emailVerified) {
        console.warn('Email no verificado');

        // Permitir continuar pero mostrar advertencia
        localStorage.setItem('checkoutWarning', 'Tu email no está verificado. Verifica tu correo para evitar problemas con tu pedido.');
    }

    // 4. Todo OK, permitir acceso
    return true;
};

/**
 * Guard para proteger la ruta de checkout
 * Verifica que el usuario esté autenticado antes de proceder al pago
 * Si no está autenticado, redirige al login y guarda la URL de checkout
 */
export const authCheckoutGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verificar si el usuario está autenticado
    if (authService.isAuthenticated()) {
        return true;
    }

    // Si no está autenticado, guardar la URL de checkout y redirigir al login
    authService.setRedirectUrl('carrito/pago'); // Mantengo esta lógica específica
    router.navigate(['/login'], {
        queryParams: {
            returnUrl: state.url, // Opcionalmente, puedes usar 'carrito/pago' si quieres forzar
            message: 'Debes iniciar sesión para completar tu compra',
            display: 'modal' //Instrucción para abrir el modal
        }
    });

    return false;
}