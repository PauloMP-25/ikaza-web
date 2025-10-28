// components/purchase-confirmation-modal/purchase-confirmation-modal.component.ts
import { Component, OnInit, Input, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, switchMap, tap, finalize } from 'rxjs/operators';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CartService } from '@core/services/carrito/cart';
import { CartItem } from '@core/models/carrito/cart-item';
import { MercadoPagoService } from '@core/services/metodos/mercado-pago';
import { CulqiService, CulqiChargeResponse } from '@core/services/metodos/culqui';
import { AuthService } from '@core/services/auth/auth';
import { ItemPedido } from '@core/models/pedido/pedido.model';
declare global {
  interface Window {
    Culqi: any;
    culqi?: () => void;
  }
}
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
  private culqiService = inject(CulqiService);
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
    delete window.culqi;
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Inicializar componente y configurar callback de Culqi
   */
  private inicializarComponente(): void {
    window.culqi = this.culqiCallback.bind(this);
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
  // CULQI (FLUJO REACTIVO)
  // ============================================================================

  /**
   * Procesar pago con Culqi usando flujo reactivo
   */
  /**
   * Procesar pago con Culqi usando flujo reactivo
   */
  proceedToCulqui(): void {
    this.verificarAutenticacion$().pipe(
      takeUntil(this.destroy$),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          throw new Error('Usuario no autenticado');
        }

        if (this.cartItems.length === 0) {
          throw new Error('El carrito está vacío');
        }

        return this.cartTotal$;
      }),
      takeUntil(this.destroy$),
      tap(total => {
        if (isNaN(total) || total <= 0) {
          throw new Error('Error: El total del carrito no es válido.');
        }

        this.configurarYAbrirCulqi(total);
      })
    ).subscribe({
      error: (error) => this.manejarErrorCulqiInicial(error)
    });
  }

  /**
   * Configurar y abrir modal de Culqi
   */
  private configurarYAbrirCulqi(total: number): void {
    const montoCulqi = Math.round(total * 100);

    if (!window.Culqi) {
      this.mostrarError('Error: Culqi no está disponible. Por favor, intenta más tarde.');
      return;
    }

    window.Culqi.publicKey = 'pk_test_eb16955d4d3abdf7';
    window.Culqi.settings({
      title: 'TIENDA ONLINE IKAZA IMPORT',
      currency: 'PEN',
      amount: montoCulqi
    });

    window.Culqi.options({
      lang: "auto",
      installments: false,
      paymentMethods: {
        yapeQR: true,
        yape: true,
        tarjeta: true,
        bancaMovil: true,
        pagoEfectivo: true,
        transferencia: true,
        pagoFacil: true,
        mercadoPagoQR: true,
        pagoQR: true,
        pagoLink: true,
      },
      style: {
        logo: "https://tse2.mm.bing.net/th/id/OIP.E9TIFcPkumP9HbJxTPpTJQHaHa?pid=Api&P=0&h=180",
        maincolor: "#28a745",
        buttontextcolor: "#ffffff",
        desccolor: "#28a745",
        maintextcolor: "#000000",
        subtitletextcolor: "#000000",
        overlaycolor: "#000000",
        overlayopacity: "0.6"
      }
    });

    this.closeModal();
    window.Culqi.open();
  }

  /**
   * Callback invocado por Culqi al completar el pago
   */
  private culqiCallback(): void {
    if (window.Culqi.token) {
      this.procesarTokenCulqi(window.Culqi.token.id);
    } else if (window.Culqi.error) {
      this.manejarErrorCulqi(window.Culqi.error);
    }
  }

  /**
   * Procesar token de Culqi usando flujo reactivo
   */
  private procesarTokenCulqi(token: string): void {
    this.isProcessing = true;

    this.cartTotal$.pipe(
      takeUntil(this.destroy$),
      switchMap(total => {
        const montoCulqi = Math.round(total * 100);
        console.log('💳 Procesando cargo en backend...');

        return this.culqiService.charge(token, montoCulqi);
      }),
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: (response) => this.manejarRespuestaCulqi(response),
      error: (error) => this.manejarErrorProcesamientoCulqi(error)
    });
  }

  /**
   * Manejar respuesta exitosa de Culqi
   */
  private manejarRespuestaCulqi(response: CulqiChargeResponse): void {
    if (response.success) {
      console.log('✅ Pago exitoso:', response.transactionId);
      this.cartService.clearCart();

      this.router.navigate(['/pago-exito'], {
        queryParams: {
          transactionId: response.transactionId,
          method: 'culqi'
        }
      });
    } else {
      throw new Error(response.error || 'Error desconocido');
    }
  }

  // ============================================================================
  // MANEJO DE ERRORES
  // ============================================================================

  /**
   * Manejar error inicial de Culqi
   */
  private manejarErrorCulqiInicial(error: any): void {
    console.error('❌ Error al abrir Culqi:', error);
    this.mostrarError('Error al iniciar el pago: ' + (error.message || 'Intenta de nuevo'));
  }

  /**
   * Manejar error de procesamiento de Culqi
   */
  private manejarErrorProcesamientoCulqi(error: any): void {
    console.error('❌ Error en Culqi:', error);
    this.router.navigate(['/pago-error'], {
      queryParams: {
        motivo: error.message || 'Error al procesar el pago',
        method: 'culqi'
      }
    });
  }

  /**
   * Manejar error específico de Culqi
   */
  private manejarErrorCulqi(error: any): void {
    const errorMessage = error.merchant_message ||
      error.user_message ||
      'Error desconocido';

    console.error('❌ Error de Culqi:', errorMessage);
    this.router.navigate(['/pago-error'], {
      queryParams: {
        motivo: errorMessage,
        method: 'culqi'
      }
    });
  }

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