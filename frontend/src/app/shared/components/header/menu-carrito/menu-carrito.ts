// src/app/components/cart-offcanvas/cart-offcanvas.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators'; // para mejor manejo
import { CartService } from '@core/services/carrito/cart';
import { CartItem } from '@core/models/carrito/cart-item';
import { AuthService } from '@core/services/auth/auth';
import { UsuarioBackendService } from '@core/services/usuarios/usuario-backend.service';
import { ResumenCarrito } from '@shared/components/resumen-carrito/resumen-carrito';
import { CheckoutService } from '@core/services/checkout/checkout.service.ts';
import { ItemPedido, PedidoRequest } from '@core/models/pedido/pedido.model';

declare var bootstrap: any;

@Component({
  selector: 'app-cart-offcanvas',
  standalone: true,
  imports: [CommonModule, ResumenCarrito],
  templateUrl: './menu-carrito.html',
  styleUrls: ['./menu-carrito.scss']
})
export class CartOffcanvasComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioBackendService);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);

  cartItems: CartItem[] = [];
  private cartSubscription?: Subscription;
  private modalElement: HTMLElement | null = null;

  // Estado de autenticación
  isAuthenticated: boolean = false;
  userHasCompleteData: boolean = false;
  missingRequirements: string[] = [];
  isCheckingAuth: boolean = false;
  userEmail: string = '';
  isProcessing: boolean = false;
  metodoPagoSeleccionado: string = '';

  //Suscripciones
  private authSubscription?: Subscription; // <--- Nueva suscripción
  ngOnInit() {
    this.loadCartItems();
    this.subscribeToAuth(); // <--- Llama al nuevo método

    this.cartSubscription = this.cartService.cartCount$.subscribe(() => {
      this.loadCartItems();
    });
  }

  ngOnDestroy() {
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
  * Suscribe al estado del usuario para mantener la autenticación actualizada.
  */
  private subscribeToAuth() {
    // 1. Suscribirse a user$ para reaccionar a los cambios de estado
    this.authSubscription = this.authService.user$.subscribe(currentUser => {

      this.isAuthenticated = !!currentUser;

      if (currentUser) {
        this.userEmail = currentUser.email || '';
        this.checkCompleteData(currentUser.uid); // Llama a la verificación de datos
      } else {
        this.userEmail = '';
        this.userHasCompleteData = false;
      }
    });
  }

  /**
  * Verificar datos completos del usuario y listar los faltantes.
  */
  private checkCompleteData(uid: string) {
    this.missingRequirements = []; // Limpiamos la lista al inicio
    this.usuarioService.obtenerPerfil(uid).subscribe({
      next: (usuario) => {
        // Validación detallada
        const missing: string[] = [];

        // 1. Validar Nombre Completo (nombres + apellidos)
        if (!usuario.nombres || !usuario.apellidos) {
          missing.push('Nombre y Apellido completo');
        }

        // 2. Validar Documento
        if (!usuario.numeroDocumento) {
          missing.push('Número de Documento (DNI/RUC)');
        }

        // 3. Validar Teléfono y verificación
        if (!usuario.telefono || !usuario.telefonoVerificado) {
          missing.push('Número de Teléfono verificado');
        }

        // 4. Actualizar estados
        this.missingRequirements = missing;
        this.userHasCompleteData = missing.length === 0;

        console.log('✅ Datos del usuario verificados:', {
          completos: this.userHasCompleteData,
          faltantes: missing
        });
      },
      error: (error) => {
        // ... (manejo de error existente)
        this.userHasCompleteData = false;
      }
    });
  }

  /**
   * Abrir modal de pago (CON VALIDACIÓN DE AUTENTICACIÓN)
   */
  openModal() {
    // 1. Verificar carrito (existente)
    if (this.cartItems.length === 0) {
      this.showAlert('Tu carrito está vacío', 'warning');
      return;
    }

    // 2. Verificar autenticación (existente)
    if (!this.isAuthenticated) {
      this.showLoginRequiredAlert();
      return;
    }

    // 3. Verificar datos completos (USANDO EL NUEVO ESTADO)
    if (!this.userHasCompleteData) {
      this.showCompleteDataAlert(this.missingRequirements); // Pasamos la lista de faltantes
      return;
    }

    // 4. Todo OK, permitir acceso (existente)
    this.openPaymentModal();
  }

  /**
   * Mostrar alerta de datos incompletos (MODIFICADO)
   */
  private showCompleteDataAlert(missingItems: string[]) {
    const missingList = missingItems.map(item => `- ${item}`).join('\n');

    const shouldProceed = confirm(
      '⚠️ Necesitas completar tu perfil antes de realizar una compra.\n\n' +
      'Información requerida FALTANTE:\n' +
      missingList +
      '\n\n¿Deseas completar tu perfil ahora?'
    );

    if (shouldProceed) {
      // Cerrar offcanvas
      this.closeOffcanvas();

      // Redirigir a completar perfil
      this.router.navigate(['/panel-usuario/datos-personales']);
    }
  }

  /**
   * Mostrar alerta de login requerido
   */
  private showLoginRequiredAlert() {
    const shouldProceed = confirm(
      '⚠️ Debes iniciar sesión para realizar una compra.\n\n' +
      '¿Deseas ir a la página de inicio de sesión?'
    );

    if (shouldProceed) {
      // Guardar URL de retorno
      this.authService.setRedirectUrl('/carrito/pago');

      // Cerrar offcanvas
      this.closeOffcanvas();

      // Redirigir a login con el parámetro del modal
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/carrito/pago',
          message: 'Debes iniciar sesión para realizar una compra',
          display: 'modal' // 👈 Forzar apertura del modal
        }
      });
    }
  }

  /**
   * Abrir modal de pago (tu modal existente de Culqi/MercadoPago)
   */
  private openPaymentModal() {
    // Cerrar el offcanvas primero
    this.closeOffcanvas();

    // Abrir el modal de confirmación de pago
    setTimeout(() => {
      if (!this.modalElement) {
        this.modalElement = document.getElementById('confirmModal');
      }

      if (this.modalElement && bootstrap) {
        const modal = new bootstrap.Modal(this.modalElement);
        modal.show();
      } else {
        console.warn('Modal element not found or Bootstrap not loaded');
      }
    }, 300);
  }

  /**
   * Cerrar offcanvas del carrito
   */
  private closeOffcanvas() {
    const offcanvasElement = document.getElementById('cartOffcanvas');
    if (offcanvasElement && bootstrap) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
      if (offcanvas) {
        offcanvas.hide();
      }
    }
  }

  /**
   * Cerrar modal de pago
   */
  closeModal() {
    if (this.modalElement && bootstrap) {
      const modal = bootstrap.Modal.getInstance(this.modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Cargar items del carrito
   */
  private loadCartItems() {
    this.cartItems = this.cartService.getCartItems();
    this.cartItems.forEach(item => {
      if (!item.qty) item.qty = 1;
    });
  }

  /**
   * Remover item del carrito
   */
  removeItem(productId: number) {
    const shouldRemove = confirm('¿Estás seguro de eliminar este producto del carrito?');
    if (shouldRemove) {
      this.cartService.removeFromCart(productId);
      this.showAlert('Producto eliminado del carrito', 'success');
    }
  }

  /**
   * Limpiar carrito completo
   */
  clearCart() {
    const shouldClear = confirm('¿Estás seguro de vaciar todo el carrito?');
    if (shouldClear) {
      this.cartService.clearCart();
      this.showAlert('Carrito vaciado', 'info');
    }
  }

  /**
   * Mostrar alerta temporal
   */
  private showAlert(message: string, type: 'success' | 'warning' | 'info' | 'danger') {
    const alertClass = `alert-${type}`;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 3000);
  }

  /**
   * Calcular total del carrito
   */
  get total(): number {
    return this.cartItems.reduce((sum: number, item: CartItem) => {
      const qty = item.qty || 1;
      const price = item.precio || 0;
      return sum + (price * qty);
    }, 0);
  }

  /**
   * Verificar si puede proceder al pago
   */
  get canProceedToPayment(): boolean {
    return this.cartItems.length > 0 && this.isAuthenticated && this.userHasCompleteData;
  }

  /**
   * Obtener texto del botón de pago
   */
  get paymentButtonText(): string {
    if (this.cartItems.length === 0) return 'Carrito vacío';
    if (!this.isAuthenticated) return 'Iniciar sesión para pagar';
    if (!this.userHasCompleteData) return 'Completar perfil';
    return 'Ir al pago';
  }

  /**
   * Obtener icono del botón de pago
   */
  get paymentButtonIcon(): string {
    if (!this.isAuthenticated) return 'bi-box-arrow-in-right';
    if (!this.userHasCompleteData) return 'bi-person-fill-exclamation';
    return 'bi-credit-card';
  }

  /**
   * Construir PedidoRequest desde el carrito.
   */
  private construirPedidoRequest(metodoPago: string): PedidoRequest {
    const items: ItemPedido[] = this.cartItems.map(item =>
      this.checkoutService.construirItemPedido(item)
    );

    return {
      cartItems: items,
      total: this.total,
      subtotal: this.total, // Asumimos que total = subtotal en esta etapa del checkout
      metodoPago: metodoPago,
      email: this.userEmail,
      notasAdicionales: 'Pedido generado desde el offcanvas' // Opcional
    };
  }

  /**
   * Inicia el flujo de pago con Mercado Pago (Redirección).
   * Llama a POST /api/pedidos/checkout.
   */
  proceedToMercadoPago() {
    if (!this.canProceedToPayment) return;
    this.isProcessing = true;
    this.metodoPagoSeleccionado = 'MERCADO_PAGO';

    const request = this.construirPedidoRequest('MERCADO_PAGO');

    this.checkoutService.procesarCheckout(request).subscribe({
      next: (response) => {
        this.showAlert('Redirigiendo a Mercado Pago...', 'info');
        this.closeModal();
        this.isProcessing = false;

        if (response.success && response.redirectionUrl) {
          // Redireccionar a la pasarela externa [cite: 132, 979]
          setTimeout(() => {
            window.location.href = response.redirectionUrl!;
          }, 1000);
        } else {
          this.showAlert(response.mensaje || 'Error al crear preferencia de Mercado Pago', 'danger');
        }
      },
      error: (error) => {
        console.error('❌ Error en checkout:', error);
        this.showAlert(error.message || 'Error al procesar el pedido con MP', 'danger');
        this.isProcessing = false;
      }
    });
  }

  /**
   * Inicia el flujo de pago con Transferencia Bancaria (Pago Diferido).
   * Llama a POST /api/pedidos/checkout.
   */
  proceedToTransferencia() {
    if (!this.canProceedToPayment) return;
    this.isProcessing = true;
    this.metodoPagoSeleccionado = 'TRANSFERENCIA_BANCARIA';

    const request = this.construirPedidoRequest('TRANSFERENCIA_BANCARIA');

    this.checkoutService.procesarCheckout(request).subscribe({
      next: (response) => {
        this.showAlert('Pedido creado con pago pendiente', 'success');
        this.closeModal();
        this.isProcessing = false;

        if (response.success) {
          // Redirigir a la página de pago pendiente para ver instrucciones [cite: 984]
          this.router.navigate(['/pago-pendiente'], {
            queryParams: {
              pedidoId: response.pedidoId,
              numeroPedido: response.numeroPedido
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error en checkout:', error);
        this.showAlert(error.message || 'Error al procesar el pedido con Transferencia', 'danger');
        this.isProcessing = false;
      }
    });
  }

  /**
   * Inicia el flujo de pago con Efectivo Contra Entrega (Pago Diferido).
   * Llama a POST /api/pedidos/checkout.
   */
  proceedToEfectivo() {
    if (!this.canProceedToPayment) return;
    this.isProcessing = true;
    this.metodoPagoSeleccionado = 'EFECTIVO_CONTRAENTREGA';

    const request = this.construirPedidoRequest('EFECTIVO_CONTRAENTREGA');

    this.checkoutService.procesarCheckout(request).subscribe({
      next: (response) => {
        this.showAlert('Pedido creado con pago en efectivo', 'success');
        this.closeModal();
        this.isProcessing = false;

        if (response.success) {
          // Redirigir a la página de pago pendiente para ver instrucciones [cite: 1099]
          this.router.navigate(['/pago-pendiente'], {
            queryParams: {
              pedidoId: response.pedidoId,
              numeroPedido: response.numeroPedido
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error en checkout:', error);
        this.showAlert(error.message || 'Error al procesar el pedido con Efectivo', 'danger');
        this.isProcessing = false;
      }
    });
  }

  /**
   * Redirige al componente de Checkout para manejar la pasarela Culqi.
   */
  proceedToCulqi() {
    if (!this.canProceedToPayment) return;
    this.metodoPagoSeleccionado = 'CULQI';
    this.closeModal();
    // Redirigir a la página de checkout (donde se manejará el script de Culqi)
    this.router.navigate(['/checkout'], {
      queryParams: { metodo: 'CULQI' }
    });
  }
}
