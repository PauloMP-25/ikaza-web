// src/app/features/checkout/pago-exito/pago-exito.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckoutService } from '@core/services/checkout/checkout.service.ts';
import { CartService } from '@core/services/carrito/cart';

@Component({
  selector: 'app-pago-exito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-exitoso.html',
  styleUrl: './pago-exitoso.scss'
})
export class PagoExitoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);
  private cartService = inject(CartService);

  pedidoId: number | null = null;
  numeroPedido: string = '';
  transactionId: string = '';
  metodoPago: string = '';
  isLoading: boolean = true;
  error: string = '';
  pedidoConfirmado: boolean = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      // Parámetros comunes
      this.metodoPago = params['method'] || 'mercadopago';
      
      // Si viene de Culqi (pago síncrono)
      if (this.metodoPago === 'culqi') {
        this.procesarPagoCulqi(params);
        return;
      }
      
      // Si viene de Mercado Pago (pago asíncrono)
      this.procesarPagoMercadoPago(params);
    });
  }

  /**
   * Procesa pago de Culqi (ya confirmado en el backend).
   */
  private procesarPagoCulqi(params: any): void {
    this.transactionId = params['transactionId'] || '';
    this.pedidoConfirmado = true;
    this.isLoading = false;
    
    // Limpiar carrito
    this.cartService.clearCart();
    
    console.log('✅ Pago Culqi confirmado:', this.transactionId);
  }

  /**
   * Procesa pago de Mercado Pago (requiere validación).
   */
  private procesarPagoMercadoPago(params: any): void {
    // Extraer parámetros de Mercado Pago
    this.pedidoId = params['pedidoId'] ? parseInt(params['pedidoId']) : null;
    const paymentId = params['payment_id'] || '';
    const status = params['status'] || 'approved';
    const collectionStatus = params['collection_status'] || '';
    
    console.log('📥 Parámetros de retorno de MP:', {
      pedidoId: this.pedidoId,
      paymentId,
      status,
      collectionStatus
    });

    // Validar que tengamos los parámetros necesarios
    if (!this.pedidoId) {
      this.error = 'No se encontró el ID del pedido';
      this.isLoading = false;
      return;
    }

    // Si el status no es approved, redirigir según el caso
    if (status === 'rejected' || status === 'cancelled') {
      this.router.navigate(['/pago-error'], {
        queryParams: {
          pedidoId: this.pedidoId,
          status: status,
          motivo: this.obtenerMotivoRechazo(status)
        }
      });
      return;
    }

    if (status === 'pending' || status === 'in_process') {
      this.router.navigate(['/pago-pendiente'], {
        queryParams: {
          pedidoId: this.pedidoId,
          status: status
        }
      });
      return;
    }

    // Si llegamos aquí, el status es 'approved' - confirmar con el backend
    this.confirmarPagoConBackend(this.pedidoId, paymentId, status);
  }

  /**
   * Confirma el pago con el backend.
   */
  private confirmarPagoConBackend(pedidoId: number, paymentId: string, status: string): void {
    console.log('🔄 Confirmando pago con backend...');
    
    this.checkoutService.confirmarPagoMercadoPago(pedidoId, paymentId, status).subscribe({
      next: (response) => {
        console.log('📨 Respuesta del backend:', response);

        if (response.success) {
          // Pago confirmado exitosamente
          this.numeroPedido = response.numeroPedido || `#${pedidoId}`;
          this.transactionId = paymentId;
          this.pedidoConfirmado = true;
          
          // Limpiar carrito
          this.cartService.clearCart();
          
          console.log('✅ Pedido confirmado:', this.numeroPedido);
        } else {
          // Error en la confirmación
          this.error = response.mensaje || 'Error al confirmar el pago';
          console.error('❌ Error en confirmación:', this.error);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al confirmar pago:', error);
        this.error = 'Error al validar el pago. Por favor, contacta a soporte.';
        this.isLoading = false;
        
        // Redirigir a error después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/pago-error'], {
            queryParams: {
              pedidoId: pedidoId,
              motivo: 'Error de validación del pago'
            }
          });
        }, 3000);
      }
    });
  }

  /**
   * Obtiene un mensaje descriptivo del motivo de rechazo.
   */
  private obtenerMotivoRechazo(status: string): string {
    const motivos: { [key: string]: string } = {
      'rejected': 'El pago fue rechazado por el banco emisor',
      'cancelled': 'El pago fue cancelado por el usuario',
      'pending': 'El pago está pendiente de confirmación',
      'in_process': 'El pago está siendo procesado'
    };
    
    return motivos[status] || 'Estado desconocido del pago';
  }

  /**
   * Navega al historial de pedidos.
   */
  irAMisPedidos(): void {
    this.router.navigate(['/panel-usuario/historial-compras']);
  }

  /**
   * Navega al catálogo de productos.
   */
  irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  /**
   * Descarga la factura del pedido (si está disponible).
   */
  descargarFactura(): void {
    if (!this.pedidoId) return;
    
    // TODO: Implementar descarga de factura
    console.log('📄 Descargando factura del pedido:', this.pedidoId);
    alert('Función de descarga de factura en desarrollo');
  }
}
