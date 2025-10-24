// src/app/core/services/checkout/checkout.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  PedidoResponse,
  PedidoRequest,
  ItemPedido
} from '@core/models/pedido/pedido.model';

/**
 * Respuesta de confirmación de pago (Mercado Pago).
 */
export interface ConfirmacionPagoResponse {
  success: boolean;
  estadoPago: string;
  numeroPedido?: string;
  mensaje?: string;
}

/**
 * Servicio para gestionar el proceso de checkout y confirmación de pagos.
 * 
 * Responsabilidades:
 * 1. Procesar checkout completo (con todos los datos del pedido)
 * 2. Confirmar pagos asíncronos (Mercado Pago)
 * 3. Mapear datos del carrito a formato del backend
 */
@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private apiUrl = `${environment.apiUrl}/api/usuarios/pedidos`; // ⚠️ Ajustado según tu backend

  constructor(private http: HttpClient) { }

  // ========================================================================
  // CHECKOUT COMPLETO
  // ========================================================================

  /**
   * Procesa un pedido completo con todos los datos.
   * 
   * Usado para:
   * - Pagos con transferencia bancaria
   * - Pagos contra entrega
   * - Pagos con tarjeta guardada
   * 
   * POST /api/usuarios/pedidos/checkout
   * 
   * @param request - Datos completos del pedido
   * @returns Observable con la respuesta del pedido
   */
  procesarCheckout(request: PedidoRequest): Observable<PedidoResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('📦 Enviando checkout al backend:', request);

    return this.http.post<PedidoResponse>(
      `${this.apiUrl}/crear`,
      request,
      { headers }
    ).pipe(
      tap(response => {
        console.log('✅ Checkout procesado:', response);
      }),
      catchError(error => {
        console.error('❌ Error en checkout:', error);
        const mensaje = error.error?.mensaje ||
          error.message ||
          'Error al procesar el pedido';
        return throwError(() => new Error(mensaje));
      })
    );
  }

  // ========================================================================
  // CONFIRMACIÓN DE PAGOS ASÍNCRONOS
  // ========================================================================

  /**
   * Confirma un pago de Mercado Pago después de la redirección.
   * 
   * El frontend llama a este método cuando el usuario regresa de Mercado Pago.
   * El backend valida el pago con la API de Mercado Pago y actualiza el pedido.
   * 
   * POST /api/usuarios/pedidos/confirmar-pago
   * 
   * @param pedidoId - ID del pedido a confirmar
   * @param paymentId - ID del pago en Mercado Pago
   * @param status - Estado del pago (approved, rejected, pending)
   * @returns Observable con la confirmación del pago
   */
  confirmarPagoMercadoPago(
    pedidoId: number,
    paymentId: string,
    status: string
  ): Observable<ConfirmacionPagoResponse> {
    const params = new HttpParams()
      .set('pedidoId', pedidoId.toString())
      .set('paymentId', paymentId)
      .set('status', status);
    console.log('🔄 Confirmando pago de Mercado Pago:', { pedidoId, paymentId, status });
    return this.http.get<ConfirmacionPagoResponse>(
      `${this.apiUrl}/confirmar-mercadopago`,
      { params }
    ).pipe(
      tap(response => {
        console.log('✅ Pago confirmado:', response);
      }),
      catchError(error => {
        console.error('❌ Error al confirmar pago:', error);
        return throwError(() => error);
      })
    );
  }

  // ========================================================================
  // UTILIDADES DE MAPEO
  // ========================================================================

  /**
   * Mapea un item del carrito (frontend) a ItemPedido (backend).
   * 
   * Uso:
   * ```typescript
   * const itemsBackend = cartItems.map(item => 
   *   checkoutService.construirItemPedido(item)
   * );
   * ```
   * 
   * @param cartItem - Item del carrito del frontend
   * @returns ItemPedido formateado para el backend
   */
  construirItemPedido(cartItem: any): ItemPedido {
    return {
      idProducto: cartItem.idProducto,
      cantidad: cartItem.qty || 1,
      precioUnitario: cartItem.precio,
      nombreProducto: cartItem.nombreProducto,
      color: cartItem.color || null,
      talla: cartItem.size || cartItem.talla || null, // Soporta ambos nombres
      sku: cartItem.sku || null,
      imagenUrl: cartItem.image || cartItem.imagenUrl || null
    };
  }

  /**
   * Construye un PedidoRequest completo desde el carrito.
   * 
   * Uso:
   * ```typescript
   * const pedidoRequest = checkoutService.construirPedidoRequest(
   *   cartItems,
   *   idUsuario,
   *   total,
   *   'TRANSFERENCIA_BANCARIA',
   *   direccionId
   * );
   * ```
   */
  construirPedidoRequest(
    cartItems: any[],
    idUsuario: number,
    total: number,
    metodoPago: string,
  ): PedidoRequest {
    const subtotal = total * 0.82; // Ejemplo: 18% de IGV

    return {
      idUsuario: idUsuario,
      cartItems: cartItems.map(item => this.construirItemPedido(item)),
      metodoPago: metodoPago,
      subtotal: subtotal,
      total: total,
      email: '', // Se puede agregar si es necesario
      tokenCulqi: '',
      idTarjetaGuardada: undefined
    };
  }

  // ========================================================================
  // MÉTODOS ADICIONALES (OPCIONAL)
  // ========================================================================

  /**
   * Obtiene el estado actual de un pedido.
   * Útil para verificar si un pago se procesó correctamente.
   */
  obtenerEstadoPedido(pedidoId: number): Observable<PedidoResponse> {
    return this.http.get<PedidoResponse>(`${this.apiUrl}/${pedidoId}`).pipe(
      catchError(error => {
        console.error('❌ Error al obtener estado del pedido:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancela un pedido (si está en estado PENDIENTE).
   */
  cancelarPedido(pedidoId: number, motivo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${pedidoId}/cancelar`, { motivo }).pipe(
      tap(() => console.log('✅ Pedido cancelado:', pedidoId)),
      catchError(error => {
        console.error('❌ Error al cancelar pedido:', error);
        return throwError(() => error);
      })
    );
  }
}