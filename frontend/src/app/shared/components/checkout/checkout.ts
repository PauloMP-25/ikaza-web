// src/app/features/carrito/checkout/checkout.component.ts
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CartService } from '@core/services/carrito/cart';
import { CheckoutService } from '@core/services/checkout/checkout.service.ts';
import { CulqiService } from '@core/services/metodos/culqui';
import { AuthService } from '@core/services/auth/auth';
import { firstValueFrom } from 'rxjs';
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  // ✅ Servicios Inyectados
  private checkoutService = inject(CheckoutService);
  private culqiService = inject(CulqiService);

  isLoading: boolean = true;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const metodo = params['metodo'];
      if (metodo === 'CULQI') {
        this.iniciarFlujoCulqi();
      } else {
        // Si el componente se carga sin método, redirigir al carrito
        this.router.navigate(['/carrito']);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar el callback global al destruir el componente
    delete window.culqi;
  }

  private async iniciarFlujoCulqi(): Promise<void> {
    this.isLoading = true;

    const total = await firstValueFrom(this.cartService.cartTotal$);
    const email = this.authService.getCurrentUser()?.email;

    if (!email || total <= 0) {
      this.router.navigate(['/carrito']);
      return;
    }

    // 1. Configurar el callback de Culqi antes de abrir el modal
    window.culqi = this.culqiCallback.bind(this);

    // 2. Abrir el modal de Culqi
    if (window.Culqi) {
      this.configurarYAbrirCulqi(total);
    } else {
      console.error('El script de Culqi no se ha cargado.');
      alert('Error: La pasarela de pago no está disponible.');
      this.router.navigate(['/carrito']);
    }
  }

  private configurarYAbrirCulqi(total: number): void {
    const montoCulqi = Math.round(total * 100); // Culqi requiere monto en centavos

    window.Culqi.publicKey = 'pk_test_...'; //Reemplazar con tu Public Key de Culqi
    window.Culqi.settings({
      title: 'TIENDA ONLINE IKAZA',
      currency: 'PEN',
      amount: montoCulqi,
      // Puedes añadir más settings según tu necesidad
    });

    //Agregando la configuración completa del look and feel aquí (opciones)
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

    // Ocultar spinner
    this.isLoading = false;

    // Abrir modal
    window.Culqi.open();
  }

  /**
   * Callback invocado por el script de Culqi al generar el token (éxito o error).
   */
  private async culqiCallback(): Promise<void> {
    if (window.Culqi.token) {
      this.isLoading = true;
      const token = window.Culqi.token.id;
      console.log('Token de Culqi generado:', token);

      try {
        // 1. Obtener datos para el PedidoRequest
        const total = await firstValueFrom(this.cartService.cartTotal$);
        const email = this.authService.getCurrentUser()?.email || '';

        const request: PedidoRequest = this.construirPedidoRequest(
          'CULQI',
          total,
          email,
          token
        );

        // 2. Llamar al backend para procesar el pedido con el token
        const response = await firstValueFrom(
          this.checkoutService.procesarCheckout(request)
        );

        // 3. Manejar respuesta
        this.manejarRespuestaExito(response);

      } catch (error) {
        console.error('❌ Error al procesar el pedido con token Culqi:', error);
        this.router.navigate(['/pago-error'], {
          queryParams: { status: 'rejected', motivo: 'Error en el servidor al procesar el cargo' }
        });
      } finally {
        this.isLoading = false;
      }

    } else if (window.Culqi.error) {
      console.error('❌ Error de Culqi:', window.Culqi.error);
      const errorMessage = window.Culqi.error.merchant_message || 'El pago fue cancelado o rechazado.';
      alert(errorMessage);
      this.router.navigate(['/pago-error'], {
        queryParams: { status: 'cancelled', motivo: errorMessage }
      });
    }
  }

  /**
   * Función utilitaria para construir el PedidoRequest.
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

  /**
   * Redirige después de un checkout exitoso síncrono (Culqi).
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
        queryParams: { status: 'rejected', motivo: response.mensaje }
      });
    }
  }
}