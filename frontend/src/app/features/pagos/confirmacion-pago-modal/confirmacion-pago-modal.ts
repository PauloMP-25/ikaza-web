// components/purchase-confirmation-modal/purchase-confirmation-modal.component.ts
import { Component, OnInit, Input, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, switchMap, tap, finalize } from 'rxjs/operators';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CartService } from '@core/services/carrito/cart';
import { CartItem } from '@core/models/carrito/cart-item';
import { MercadoPagoService } from '@core/services/metodos/mercado-pago';
import { AuthService } from '@core/services/auth/auth';
import { ItemPedido } from '@core/models/pedido/pedido.model';

declare var bootstrap: any;
@Component({
  selector: 'app-confirmacion-pago-modal',
  standalone: true,
  imports: [AsyncPipe, CommonModule],
  templateUrl: './confirmacion-pago-modal.html',
  styleUrls: ['./confirmacion-pago-modal.scss']
})
export class ConfirmacionPagoModalComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private cartService = inject(CartService);
  private mercadoPagoService = inject(MercadoPagoService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // ============================================================================
  // INPUT PROPERTIES
  // ============================================================================
  @Input() showModal: boolean = false;

  // ============================================================================
  // PROPIEDADES REACTIVAS
  // ============================================================================
  cartTotal$: Observable<number> = this.cartService.cartTotal$;
  isAuthenticated$: Observable<boolean> = this.authService.isAuthenticated$();

  // ============================================================================
  // PROPIEDADES DE ESTADO
  // ============================================================================
  cartItems: CartItem[] = [];
  isProcessing: boolean = false;
  errorMessage: string = '';

  // ============================================================================
  // PROPIEDADES PRIVADAS
  // ============================================================================
  private preferenceId: string | null = null;
  private modalElement: HTMLElement | null = null;

  // ============================================================================
  // SUBJECT PARA LIMPIAR SUBSCRIPTIONS
  // ============================================================================
  private destroy$ = new Subject<void>();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.inicializarComponente();
  }

  /**
   * Manejar cambios en las propiedades de entrada
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal'] && this.showModal) {
      this.openModal();
    }
  }

  /**
   * Limpiar subscriptions y callback global al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Inicializar componente y configurar callback de Culqi
   */
  private inicializarComponente(): void {
    this.cartItems = this.cartService.getCartItems();
  }

  // ============================================================================
  // MANEJO DEL MODAL
  // ============================================================================

  /**
   * Abrir modal de confirmación
   */
  openModal(): void {
    if (!this.modalElement) {
      this.modalElement = document.getElementById('confirmModal');
    }
    if (this.modalElement && bootstrap) {
      const modal = new bootstrap.Modal(this.modalElement);
      modal.show();
    } else {
      console.warn('Modal element not found or Bootstrap not loaded');
    }
  }

  /**
  * Cerrar modal de confirmación
  */
  closeModal(): void {
    this.closeModalInstance();
  }

  /**
   * Cerrar instancia del modal usando Bootstrap
   */
  private closeModalInstance(): void {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(confirmModal);
      if (bsModal) {
        bsModal.hide();
      }
    }
  }

  /**
  * Manejar cierre del modal
  */
  onModalClose(): void {
    this.closeModal();
  }

  // ============================================================================
  // VERIFICACIÓN DE AUTENTICACIÓN
  // ============================================================================

  /**
   * Verificar autenticación antes del pago usando flujo reactivo
   * @returns Observable<boolean> - true si está autenticado
   */
  private verificarAutenticacion$(): Observable<boolean> {
    return this.authService.isAuthenticated$().pipe(
      takeUntil(this.destroy$),
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          this.manejarRedireccionNoAutenticado();
        }
      })
    );
  }
  /**
   * Manejar redirección cuando el usuario no está autenticado
   */
  private manejarRedireccionNoAutenticado(): void {
    this.closeModalInstance();
    this.authService.setRedirectUrl('carrito/pago');
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/carrito/pago',
        message: 'Debes iniciar sesión para completar tu compra',
        display: 'modal'
      }
    });
  }

  // ============================================================================
  // MERCADO PAGO (FLUJO REACTIVO)
  // ============================================================================

  /**
   * Procesar pago con Mercado Pago usando flujo reactivo
   */
  proceedToMercadoPago(): void {
    this.isProcessing = true;
    this.errorMessage = '';

    this.verificarAutenticacion$().pipe(
      takeUntil(this.destroy$),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          throw new Error('Usuario no autenticado');
        }
        if (this.cartItems.length === 0) {
          throw new Error('El carrito está vacío');
        }

        const itemsMP: ItemPedido[] = this.mapearItemsAMercadoPago();
        console.log('Items enviados a Mercado Pago:', itemsMP);

        return this.mercadoPagoService.crearPreferencia(itemsMP);
      }),
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: (response) => this.manejarRespuestaMercadoPago(response),
      error: (error) => this.manejarErrorMercadoPago(error)
    });
  }

  /**
   * Mapear items del carrito al formato de Mercado Pago
   */
  private mapearItemsAMercadoPago(): ItemPedido[] {
    return this.cartItems.map(cartItem => ({
      idProducto: cartItem.idProducto,
      cantidad: cartItem.qty,
      precioUnitario: cartItem.precio,
      nombreProducto: cartItem.nombreProducto,
      color: cartItem.color,
      talla: cartItem.size,
      sku: cartItem.sku,
      imagenUrl: cartItem.image
    })).filter(item => item.cantidad > 0);
  }

  /**
   * Manejar respuesta exitosa de Mercado Pago
   */
  private manejarRespuestaMercadoPago(response: any): void {
    if (!response?.preference_id || !response.preference_url) {
      throw new Error('No se pudo obtener la preferencia de pago.');
    }

    console.log('Preferencia creada:', response.preference_id);
    console.log('Pedido ID:', response.pedidoId);
    console.log('URL de checkout:', response.preference_url);

    this.closeModal();
    window.location.href = response.preference_url;
  }

  /**
   * Manejar error en Mercado Pago
   */
  private manejarErrorMercadoPago(error: any): void {
    console.error('Error en Mercado Pago:', error);
    this.mostrarError('Error al procesar el pago: ' + (error.message || 'Intenta de nuevo'));
  }

  // ============================================================================
  // MANEJO DE ERRORES
  // ============================================================================

  
  /**
  * Mostrar mensaje de error en el modal
  */
  private mostrarError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
  
  // ============================================================================
  // MÉTODOS ADICIONALES
  // ============================================================================

  /**
   * Manejar éxito de pago (opcional)
   */
  onPaymentSuccess(): void {
    console.log('Pago exitoso en modal');
    this.cartService.clearCart();
  }
}