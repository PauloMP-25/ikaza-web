// components/purchase-confirmation-modal/purchase-confirmation-modal.component.ts
import { Component, OnInit, Input, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CartService } from '@core/services/carrito/cart';
import { CartItem } from '@core/models/carrito/cart-item';
import { AsyncPipe, CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MercadoPagoService } from '@core/services/metodos/mercado-pago';
import { CulqiService, CulqiChargeResponse } from '@core/services/metodos/culqui';
import { AuthService } from '@core/services/auth/auth';
import { Router } from '@angular/router';
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
  private cartService = inject(CartService);
  private mercadoPagoService = inject(MercadoPagoService);
  private culqiService = inject(CulqiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() showModal: boolean = false;
  cartTotal$: Observable<number> = this.cartService.cartTotal$;
  cartItems: CartItem[] = [];
  private preferenceId: string | null = null;
  private modalElement: HTMLElement | null = null;

  // Variables de estado para feedback visual
  isProcessing: boolean = false;
  errorMessage: string = '';

  // Nueva propiedad para verificar autenticación
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  ngOnInit(): void {
    window.culqi = this.culqiCallback.bind(this);
    this.cartTotal$ = this.cartService.cartTotal$;
    // Carga los items del carrito al inicializar el componente
    this.cartItems = this.cartService.getCartItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showModal'] && this.showModal) {
      this.openModal();
    }
  }

  ngOnDestroy(): void {
    // Limpiar callback de Culqi
    if (window.culqi) {
      delete window.culqi;
    }
  }

  // Método para abrir el modal (llamado desde el padre o automáticamente)
  openModal() {
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
    * Verifica que el usuario esté autenticado ANTES de llamar a la pasarela.
    * Si no lo está, redirige al login y devuelve false.
    */
  private checkAuthenticationBeforePayment(): boolean {
    if (!this.isAuthenticated) {
      // 1. Cerrar el modal actual
      this.closeModalInstance();

      // 2. Redirigir al login (AuthService ya guarda la URL de retorno)
      this.authService.setRedirectUrl('carrito/pago');
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/carrito/pago',
          message: 'Debes iniciar sesión para completar tu compra',
          display: 'modal'
        }
      });

      return false;
    }
    return true;
  }

  /**
   * ========== MERCADO PAGO ==========
   * Procesa el pago con Mercado Pago (flujo asíncrono con redirección).
   */
  async proceedToMercadoPago(): Promise<void> {
    if (!this.checkAuthenticationBeforePayment()) {
      return;
    }

    if (this.cartItems.length === 0) {
      this.showError('El carrito está vacío. Agrega productos antes de pagar.');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      // Mapear items del carrito al formato de Mercado Pago
      const itemsMP: ItemPedido[] = this.cartItems.map(cartItem => ({
        idProducto: cartItem.idProducto,  // Asume que CartItem tiene idProducto (Long en backend)
        cantidad: cartItem.qty,           // qty -> cantidad
        precioUnitario: cartItem.precio,  // precio -> precioUnitario
        nombreProducto: cartItem.nombreProducto,
        color: cartItem.color,            // Asume que CartItem tiene color
        talla: cartItem.size,            // Asume que CartItem tiene talla
        sku: cartItem.sku,                // Opcional
        imagenUrl: cartItem.image    // Opcional
      })).filter(item => item.cantidad > 0);


      console.log('📦 Items enviados a Mercado Pago:', itemsMP);

      // Llamar al backend para crear la preferencia Y el pedido preliminar
      const response = await firstValueFrom(
        this.mercadoPagoService.crearPreferencia(itemsMP)
      );

      if (!response || !response.preference_id || !response.preference_url) {
        throw new Error('No se pudo obtener la preferencia de pago.');
      }

      console.log('✅ Preferencia creada:', response.preference_id);
      console.log('🆔 Pedido ID:', response.pedidoId);
      console.log('🔗 URL de checkout:', response.preference_url);

      // Cerrar modal antes de redireccionar
      this.closeModal();

      // Redireccionar a Mercado Pago
      window.location.href = response.preference_url;

      // NO limpiar el carrito aquí - se limpiará cuando se confirme el pago

    } catch (error: any) {
      console.error('❌ Error en Mercado Pago:', error);
      this.showError('Error al procesar el pago: ' + (error.message || 'Intenta de nuevo'));
    } finally {
      this.isProcessing = false;
    }
  }


  /**
 * ========== CULQI ==========
 * Procesa el pago con Culqi (flujo síncrono con modal).
 */
  async proceedToCulqui(): Promise<void> {
    if (!this.checkAuthenticationBeforePayment()) {
      return;
    }

    if (this.cartItems.length === 0) {
      this.showError('El carrito está vacío. Agrega productos antes de pagar.');
      return;
    }

    try {
      const total = await firstValueFrom(this.cartTotal$);

      if (isNaN(total) || total <= 0) {
        this.showError('Error: El total del carrito no es válido.');
        return;
      }

      // Convertir a centavos para Culqi
      const montoCulqi = Math.round(total * 100);

      // Configurar y abrir Culqi
      if (window.Culqi) {
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

        // Cerrar el modal de confirmación antes de abrir Culqi
        this.closeModal();

        window.Culqi.open();
      } else {
        this.showError('Error: Culqi no está disponible. Por favor, intenta más tarde.');
      }
    } catch (error: any) {
      console.error('❌ Error al abrir Culqi:', error);
      this.showError('Error al iniciar el pago: ' + (error.message || 'Intenta de nuevo'));
    }
  }


  /**
   * Callback de Culqi - se ejecuta cuando el usuario completa el pago.
   */
  private async culqiCallback(): Promise<void> {
    if (window.Culqi.token) {
      const token = window.Culqi.token.id;
      console.log('🎟️ Token generado:', token);

      this.isProcessing = true;

      try {
        const total = await firstValueFrom(this.cartTotal$);
        const montoCulqi = Math.round(total * 100);

        console.log('💳 Procesando cargo en backend...');

        // Enviar el token al backend para procesar el cargo
        const response: CulqiChargeResponse = await firstValueFrom(
          this.culqiService.charge(token, montoCulqi)
        );

        if (response.success) {
          console.log('✅ Pago exitoso:', response.transactionId);

          // Limpiar carrito
          this.cartService.clearCart();

          // Redirigir a página de éxito
          this.router.navigate(['/pago-exito'], {
            queryParams: {
              transactionId: response.transactionId,
              method: 'culqi'
            }
          });
        } else {
          throw new Error(response.error || 'Error desconocido');
        }
      } catch (error: any) {
        console.error('❌ Error en Culqi:', error);

        // Redirigir a página de error
        this.router.navigate(['/pago-error'], {
          queryParams: {
            motivo: error.message || 'Error al procesar el pago',
            method: 'culqi'
          }
        });
      } finally {
        this.isProcessing = false;
      }
    } else if (window.Culqi.error) {
      // Error en Culqi (tarjeta rechazada, cancelación, etc.)
      const errorMessage = window.Culqi.error.merchant_message ||
        window.Culqi.error.user_message ||
        'Error desconocido';

      console.error('❌ Error de Culqi:', errorMessage);

      this.router.navigate(['/pago-error'], {
        queryParams: {
          motivo: errorMessage,
          method: 'culqi'
        }
      });
    }
  }

  /**
   * Muestra un mensaje de error en el modal.
   */
  private showError(message: string): void {
    this.errorMessage = message;

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  closeModal(): void {
    this.closeModalInstance();
  }

  private closeModalInstance(): void {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(confirmModal);
      if (bsModal) {
        bsModal.hide();
      }
    }
  }

  onModalClose(): void {
    this.closeModal();
  }

  // Opcional: Método para éxito de pago
  onPaymentSuccess(): void {
    console.log('Pago exitoso en modal');
    this.cartService.clearCart();
  }
}