import { Component, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, switchMap, of, map, catchError, takeUntil, finalize } from 'rxjs';
import { CartService } from '@core/services/carrito/cart';
import { CartItem } from '@core/models/carrito/cart-item';
import { AuthService } from '@core/services/auth/auth';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { ResumenCarrito } from '@shared/components/resumen-carrito/resumen-carrito';
import { CheckoutService } from '@core/services/checkout/checkout.service.ts';
import { ItemPedido, PedidoRequest } from '@core/models/pedido/pedido.model';
import { UserData } from '@core/models/auth/auth.models';
import { ClienteResponse } from '@core/models/cliente/cliente.models';

declare var bootstrap: any;

@Component({
  selector: 'app-cart-offcanvas',
  standalone: true,
  imports: [CommonModule, ResumenCarrito],
  templateUrl: './menu-carrito.html',
  styleUrls: ['./menu-carrito.scss']
})
export class CartOffcanvasComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private clienteService = inject(ClienteService);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);

  // ============================================================================
  // ESTADO INTERNO DEL COMPONENTE
  // ============================================================================
  private destroy$ = new Subject<void>();
  private modalElement: HTMLElement | null = null;
  public isProcessing: boolean = false;
  public metodoPagoSeleccionado: string = '';

  // ============================================================================
  // ESTADO REACTIVO PÚBLICO
  // ============================================================================
  public total = signal(0);
  public cartItems: CartItem[] = [];

  // Observable que combina el estado de Auth y Perfil
  public userState$!: Observable<{
    isAuthenticated: boolean,
    userHasCompleteData: boolean,
    email: string | null,
    missingRequirements: string[]
  }>;

  // ============================================================================
  // PROPIEDADES SÍNCRONAS (@Input para ResumenCarrito)
  // ============================================================================
  public isAuthenticated: boolean = false;
  public userHasCompleteData: boolean = false;
  public missingRequirements: string[] = [];
  public userEmail: string = '';

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit() {
    this.setupAuthStateStream();
    this.setupCartStateStream();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // STREAM REACTIVO PRINCIPAL
  // ============================================================================

  /**
   * Configura el stream reactivo para obtener el estado de autenticación y el perfil completo.
   */
  private setupAuthStateStream(): void {
    this.userState$ = this.authService.getCurrentUser$().pipe(
      // 1. Convertir UserData (Auth) en ClienteResponse (Perfil)
      switchMap((user: UserData | null) => {
        const isLoggedIn = !!user;
        const email = user ? user.email : null;

        if (!isLoggedIn || !email) {
          return of({ // Estado: No Logueado
            isAuthenticated: false,
            userHasCompleteData: false,
            email: null,
            missingRequirements: []
          });
        }

        // 2. Si está logueado, buscar el perfil
        return this.clienteService.obtenerPerfil(email).pipe(
          map((cliente: ClienteResponse) => {
            const missing = this.getMissingRequirements(cliente);

            return { // Estado: Logueado y Perfil cargado
              isAuthenticated: true,
              userHasCompleteData: cliente.datosCompletos,
              email: email,
              missingRequirements: missing
            };
          }),
          catchError(() => {
            // Error (ej: 404 Perfil no creado aún) -> Asumir Incompleto
            return of({
              isAuthenticated: true,
              userHasCompleteData: false,
              email: email,
              missingRequirements: ['Error al cargar el perfil. Puede que esté incompleto.']
            });
          })
        );
      })
    );

    // 3. Suscribirse al stream para actualizar las props síncronas del componente hijo
    this.userState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      this.userHasCompleteData = state.userHasCompleteData;
      this.userEmail = state.email || '';
      this.missingRequirements = state.missingRequirements;
    });
  }

  // ============================================================================
  // STREAM DE CARRITO
  // ============================================================================

  /**
   * Configura el stream para cargar items del carrito y recalcular el total.
   */
  private setupCartStateStream(): void {
    // 1. Suscribirse a los cambios de conteo del carrito
    this.cartService.cartCount$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadCartItems();
      this.total.set(this.calculateTotal());
    });

    // 2. Cargar items iniciales
    this.loadCartItems();
    this.total.set(this.calculateTotal());
  }

  /**
   * Cargar items del carrito (sincronamente desde el servicio)
   */
  private loadCartItems() {
    this.cartItems = this.cartService.getCartItems();
    this.cartItems.forEach(item => {
      if (!item.qty) item.qty = 1;
    });
  }

  /**
   * Calcular total del carrito
   */
  private calculateTotal(): number {
    return this.cartItems.reduce((sum: number, item: CartItem) => {
      const qty = item.qty || 1;
      const price = item.precio || 0;
      return sum + (price * qty);
    }, 0);
  }

  // ============================================================================
  // LÓGICA DE VALIDACIÓN Y ACCIÓN DEL BOTÓN (openModal)
  // ============================================================================

  /**
   * Abrir modal de pago (Handler del click en ResumenCarrito)
   */
  public openModal() {
    // 1. Verificar carrito
    if (this.cartItems.length === 0) {
      this.showAlert('Tu carrito está vacío', 'warning');
      return;
    }

    // 2. Flujo de redirección/modal según el estado del usuario
    if (!this.isAuthenticated) {
      this.handleLoginRequired(); // Abrir modal Login
      return;
    }

    if (!this.userHasCompleteData) {
      this.handleProfileIncomplete(this.missingRequirements); // Redirigir a Perfil
      return;
    }

    // 3. Todo OK, abrir modal de selección de pago
    this.openPaymentModal();
  }

  /**
   * Maneja la acción cuando el usuario no está autenticado (Redirigir a Login).
   */
  private handleLoginRequired() {
    // Usamos confirm() ya que NO debemos usar alert() o confirm() directamente en el HTML
    const shouldProceed = confirm(
      '⚠️ Debes iniciar sesión para realizar una compra.\n\n¿Deseas iniciar sesión ahora?'
    );

    if (shouldProceed) {
      this.closeOffcanvas();
      // Redirigir a login con el queryParam 'display: modal'
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/carrito/pago',
          display: 'modal'
        }
      });
    }
  }

  /**
   * Maneja la acción cuando el perfil está incompleto (Redirigir a Datos Personales).
   */
  private handleProfileIncomplete(missingItems: string[]) {
    const missingList = missingItems.map(item => `- ${item}`).join('\n');

    const shouldProceed = confirm(
      '⚠️ Necesitas completar tu perfil antes de realizar una compra.\n\n' +
      'Información requerida FALTANTE:\n' +
      missingList +
      '\n\n¿Deseas completar tu perfil ahora?'
    );

    if (shouldProceed) {
      this.closeOffcanvas();
      this.router.navigate(['/panel-usuario/datos-personales']);
    }
  }

  // ============================================================================
  // METODOS PARA ABRIR Y CERRAR MODAL DE PAGO
  // ============================================================================

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


  // ============================================================================
  // MÉTODOS AUXILIARES Y GETTERS
  // ============================================================================

  /**
   * Obtiene la lista detallada de requisitos faltantes para el mensaje al usuario.
   */
  private getMissingRequirements(usuario: ClienteResponse): string[] {
    const missing: string[] = [];

    // NOTA: Se comprueba aquí el detalle de lo que falta.
    if (!usuario.nombres || !usuario.apellidos) {
      missing.push('Nombre y Apellido completo');
    }
    if (!usuario.numeroDocumento) {
      missing.push('Número de Documento (DNI/RUC)');
    }
    if (!usuario.telefono || !usuario.telefonoVerificado) {
      missing.push('Número de Teléfono verificado');
    }
    if (!usuario.fechaNacimiento) {
      missing.push('Fecha de Nacimiento');
    }
    if (!usuario.genero) {
      missing.push('Género');
    }

    return missing;
  }

  /**
   * Construir PedidoRequest desde el carrito.
   * CORREGIDO: Usar this.total() para obtener el valor del signal.
   */
  private construirPedidoRequest(metodoPago: string): PedidoRequest {
    const items: ItemPedido[] = this.cartItems.map(item =>
      this.checkoutService.construirItemPedido(item)
    );

    const totalValue = this.total(); // 👈 CORRECCIÓN: Obtener el valor del signal

    return {
      cartItems: items,
      total: totalValue, // Valor corregido
      subtotal: totalValue, // Valor corregido
      metodoPago: metodoPago,
      email: this.userEmail,
      notasAdicionales: 'Pedido generado desde el offcanvas'
    };
  }

  // ============================================================================
  // MÉTODOS DE PAGO Y REDIRECCIÓN
  // ============================================================================

  /**
   * Simplificado para manejar Transferencia y Efectivo (Pagos diferidos)
   */
  private handleDeferredPayment(metodoPago: string, successMessage: string) {
    if (!this.canProceedToPayment) return;
    this.isProcessing = true;
    this.metodoPagoSeleccionado = metodoPago;

    const request = this.construirPedidoRequest(metodoPago);

    this.checkoutService.procesarCheckout(request).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: (response) => {
        this.closeModal();
        this.showAlert(successMessage, 'success');

        if (response.success) {
          // Redirigir a la página de pago pendiente para ver instrucciones
          this.router.navigate(['/pago-pendiente'], {
            queryParams: {
              pedidoId: response.pedidoId,
              numeroPedido: response.numeroPedido
            }
          });
        } else {
          this.showAlert(response.mensaje || `Error al crear pedido con ${metodoPago}`, 'danger');
        }
      },
      error: (error) => {
        console.error(`❌ Error en checkout (${metodoPago}):`, error);
        this.showAlert(error.message || `Error al procesar el pedido con ${metodoPago}`, 'danger');
      }
    });
  }

  /**
   * Inicia el flujo de pago con Mercado Pago (Redirección).
   */
  public proceedToMercadoPago() {
    if (!this.canProceedToPayment) return;
    this.isProcessing = true;
    this.metodoPagoSeleccionado = 'MERCADO_PAGO';

    const request = this.construirPedidoRequest('MERCADO_PAGO');

    this.checkoutService.procesarCheckout(request).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: (response) => {
        this.showAlert('Redirigiendo a Mercado Pago...', 'info');
        this.closeModal();

        if (response.success && response.redirectionUrl) {
          setTimeout(() => {
            window.location.href = response.redirectionUrl!;
          }, 1000);
        } else {
          this.showAlert(response.mensaje || 'Error al crear preferencia de Mercado Pago', 'danger');
        }
      },
      error: (error) => {
        console.error('❌ Error en checkout (MP):', error);
        this.showAlert(error.message || 'Error al procesar el pedido con MP', 'danger');
      }
    });
  }

  /**
   * Inicia el flujo de pago con Transferencia Bancaria (Pago Diferido).
   * COMBINADO: Llama al nuevo método privado.
   */
  public proceedToTransferencia() {
    this.handleDeferredPayment('TRANSFERENCIA_BANCARIA', 'Pedido creado con pago pendiente');
  }

  /**
   * Inicia el flujo de pago con Efectivo Contra Entrega (Pago Diferido).
   * COMBINADO: Llama al nuevo método privado.
   */
  public proceedToEfectivo() {
    this.handleDeferredPayment('EFECTIVO_CONTRAENTREGA', 'Pedido creado con pago en efectivo');
  }

  // ============================================================================
  // GETTERS DE VISUALIZACIÓN
  // ============================================================================

  /**
   * Getter para el componente hijo (obtiene el valor del signal)
   */
  get totalGetter(): number {
    return this.total();
  }

  /**
   * Verifica si puede proceder al pago (Solo con perfil completo)
   */
  get canProceedToPayment(): boolean {
    // Si no está vacío, no se necesita el estado de auth/perfil aquí, 
    // pero es útil para deshabilitar los botones de pago del MODAL.
    return this.cartItems.length > 0 && this.isAuthenticated && this.userHasCompleteData;
  }

  /**
   * Obtener texto del botón de pago (para ResumenCarrito)
   */
  get paymentButtonText(): string {
    if (this.cartItems.length === 0) return 'Carrito vacío';
    if (!this.isAuthenticated) return 'Iniciar sesión para pagar';
    if (!this.userHasCompleteData) return 'Completar perfil';
    return 'Ir al pago';
  }

  /**
   * Obtener icono del botón de pago (para ResumenCarrito)
   */
  get paymentButtonIcon(): string {
    if (!this.isAuthenticated) return 'bi-box-arrow-in-right';
    if (!this.userHasCompleteData) return 'bi-person-fill-exclamation';
    return 'bi-credit-card';
  }

  // ============================================================================
  // UTILS
  // ============================================================================

  /**
   * [RESTO DE UTILS: closeModal, closeOffcanvas, removeItem, clearCart, showAlert]
   */

  closeModal() {
    if (this.modalElement && bootstrap) {
      const modal = bootstrap.Modal.getInstance(this.modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  private closeOffcanvas() {
    const offcanvasElement = document.getElementById('cartOffcanvas');
    if (offcanvasElement && bootstrap) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
      if (offcanvas) {
        offcanvas.hide();
      }
    }
  }

  removeItem(productId: number) {
    const shouldRemove = confirm('¿Estás seguro de eliminar este producto del carrito?');
    if (shouldRemove) {
      this.cartService.removeFromCart(productId);
      this.showAlert('Producto eliminado del carrito', 'success');
    }
  }

  clearCart() {
    const shouldClear = confirm('¿Estás seguro de vaciar todo el carrito?');
    if (shouldClear) {
      this.cartService.clearCart();
      this.showAlert('Carrito vaciado', 'info');
    }
  }

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
}