// src/app/features/carrito/checkout/checkout.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, tap, finalize } from 'rxjs/operators';
import { CartService } from '@core/services/carrito/cart';
import { CheckoutService } from '@core/services/checkout/checkout.service.ts';
import { CulqiService } from '@core/services/metodos/culqui';
import { AuthService } from '@core/services/auth/auth';
import { ItemPedido, PedidoRequest, PedidoResponse } from '@core/models/pedido/pedido.model';

declare global {
  interface Window {
    Culqi: any;
    culqi?: () => void;
  }
}
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private checkoutService = inject(CheckoutService);
  private culqiService = inject(CulqiService);

  // ============================================================================
  // PROPIEDADES
  // ============================================================================
  isLoading: boolean = true;

  // ============================================================================
  // SUBJECT PARA LIMPIAR SUBSCRIPTIONS (Prevenir Memory Leaks)
  // ============================================================================
  private destroy$ = new Subject<void>();



  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.inicializarFlujoCheckout();
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
   * Inicializar flujo de checkout basado en parámetros de ruta
   */
  private inicializarFlujoCheckout(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (params) => {
        const metodo = params['metodo'];
        if (metodo === 'CULQI') {
          this.iniciarFlujoCulqi();
        } else {
          this.router.navigate(['/carrito']);
        }
      },
      error: (error) => {
        console.error('Error en parámetros de ruta:', error);
        this.router.navigate(['/carrito']);
      }
    });
  }

  // ============================================================================
  // FLUJO CULQI
  // ============================================================================


  /**
   * Iniciar flujo de pago con Culqi usando enfoque reactivo
   */
  private iniciarFlujoCulqi(): void {
    this.isLoading = true;

    // Combinar datos del usuario y carrito reactivamente
    this.authService.getCurrentUser$().pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user?.email) {
          throw new Error('Usuario no autenticado');
        }
        return this.cartService.cartTotal$.pipe(
          takeUntil(this.destroy$),
          tap(total => {
            if (total <= 0) {
              throw new Error('Carrito vacío');
            }
            this.configurarFlujoCulqi(user.email!, total);
          })
        );
      }),
      finalize(() => this.isLoading = false)
    ).subscribe({
      error: (error) => {
        console.error('Error en flujo Culqi:', error);
        this.router.navigate(['/carrito']);
      }
    });
  }

  /**
   * Configurar y abrir modal de Culqi
   */
  private configurarFlujoCulqi(email: string, total: number): void {
    // 1. Configurar callback global de Culqi
    window.culqi = this.culqiCallback.bind(this);

    // 2. Verificar que Culqi esté cargado
    if (!window.Culqi) {
      console.error('El script de Culqi no se ha cargado.');
      alert('Error: La pasarela de pago no está disponible.');
      this.router.navigate(['/carrito']);
      return;
    }
    // 3. Configurar Culqi
    const montoCulqi = Math.round(total * 100); // Culqi requiere monto en centavos

    window.Culqi.publicKey = 'pk_test_...'; // Reemplazar con tu Public Key de Culqi
    window.Culqi.settings({
      title: 'TIENDA ONLINE IKAZA',
      currency: 'PEN',
      amount: montoCulqi,
    });
    // 4. Configurar opciones de UI
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

    // 5. Abrir modal
    window.Culqi.open();
  }



  /**
   * Callback invocado por el script de Culqi al generar el token
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
    this.isLoading = true;

    // Combinar datos necesarios para el pedido
    this.authService.getCurrentUser$().pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user?.email) {
          throw new Error('Usuario no autenticado');
        }
        return this.cartService.cartTotal$.pipe(
          takeUntil(this.destroy$),
          switchMap(total => {
            const request: PedidoRequest = this.construirPedidoRequest(
              'CULQI',
              total,
              user.email!,
              token
            );

            return this.checkoutService.procesarCheckout(request);
          })
        );
      }),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => this.manejarRespuestaExito(response),
      error: (error) => this.manejarErrorProcesamiento(error)
    });
  }

  // ============================================================================
  // MANEJO DE RESPUESTAS
  // ============================================================================
  /**
     * Manejar respuesta exitosa del backend
     */
  private manejarRespuestaExito(response: PedidoResponse): void {
    if (response.success) {
      this.cartService.clearCart();
      this.router.navigate(['/pago-exito'], {
        queryParams: {
          pedidoId: response.pedidoId,
          payment_id: response.transaccionId,
          status: 'approved'
        }
      });
    } else {
      this.router.navigate(['/pago-error'], {
        queryParams: {
          status: 'rejected',
          motivo: response.mensaje || 'Error desconocido en el procesamiento del pago'
        }
      });
    }
  }
  /**
   * Manejar error en el procesamiento del pedido
   */
  private manejarErrorProcesamiento(error: any): void {
    console.error('❌ Error al procesar el pedido con token Culqi:', error);
    this.router.navigate(['/pago-error'], {
      queryParams: {
        status: 'rejected',
        motivo: 'Error en el servidor al procesar el cargo'
      }
    });
  }

  /**
   * Manejar error específico de Culqi
   */
  private manejarErrorCulqi(error: any): void {
    console.error('❌ Error de Culqi:', error);
    const errorMessage = error.merchant_message || 'El pago fue cancelado o rechazado.';
    alert(errorMessage);
    this.router.navigate(['/pago-error'], {
      queryParams: {
        status: 'cancelled',
        motivo: errorMessage
      }
    });
  }

  // ============================================================================
  // CONSTRUCCIÓN DE REQUEST
  // ============================================================================

  /**
   * Construir objeto PedidoRequest
   */
  private construirPedidoRequest(
    metodoPago: string,
    total: number,
    email: string,
    tokenCulqi?: string
  ): PedidoRequest {
    const cartItems = this.cartService.getCartItems();
    const items: ItemPedido[] = cartItems.map(item =>
      this.checkoutService.construirItemPedido(item)
    );

    return {
      cartItems: items,
      total: total,
      subtotal: total,
      metodoPago: metodoPago,
      email: email,
      tokenCulqi: tokenCulqi,
      notasAdicionales: 'Pedido generado desde checkout'
    };
  }
}