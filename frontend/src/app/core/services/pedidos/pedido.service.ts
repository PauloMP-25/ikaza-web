// src/app/core/services/pedidos/compras.service.ts (O PedidoService si lo renombras)
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PedidoResponse, PedidoDetalleResponse } from '@core/models/pedido/pedido.model';
import { Compra, FiltrosCompra } from '@core/models/pedido/compras.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/usuarios/pedidos`; //Endpoint


  /**
  * Obtiene la lista de todos los pedidos del usuario autenticado y los mapea a Compra.
  * GET /api/pedidos/mis-pedidos
  */
  obtenerHistorial(filtros?: FiltrosCompra): Observable<Compra[]> {
    // Aquí deberías construir HttpParams con 'filtros' si el backend los soportara.
    return this.http.get<PedidoResponse[]>(`${this.apiUrl}/mis-pedidos`).pipe(
      // 🛑 PUNTO DE VERIFICACIÓN
      tap(response => {
        console.log('✅ BACKEND DATA (mis-pedidos):', response);
        console.log('Total de pedidos recibidos:', response.length);
      }),
      map(pedidos => pedidos.map(this.mapearPedidoResponseToCompra)),
      catchError(error => {
        console.error('Error al obtener historial de pedidos:', error);
        return of([]);
      })
    );
  }

  //IMPLEMENTACIÓN DEL MÉTODO DE MAPEO
  private mapearPedidoResponseToCompra(response: PedidoResponse): Compra {
    const estadoBackend = response.estadoPedido?.toLowerCase() || 'desconocido';
    let estadoCompra: Compra['estado'];

    switch (estadoBackend) {
      case 'entregado': estadoCompra = 'entregado'; break;
      case 'enviado':
      case 'en_transito':
      case 'en_reparto':
        estadoCompra = 'enviado';
        break;
      case 'procesando':
      case 'en_preparacion':
        estadoCompra = 'procesando';
        break;
      case 'cancelado': estadoCompra = 'cancelado'; break;
      case 'devuelto': estadoCompra = 'devuelto'; break;
      case 'confirmado':
      case 'pendiente':
      default: estadoCompra = 'pendiente'; break;
    }

    return {
      id: response.pedidoId?.toString() || response.numeroPedido || 'N/A',
      numeroPedido: response.numeroPedido || 'N/A',
      // Asumiendo que el backend devuelve fechaPedido (Fase 1)
      fecha: response.fechaPedido || new Date(),
      estado: estadoCompra,
      // Asumiendo que el backend devuelve total (Fase 1)
      total: response.total || 0,
      metodoPago: response.metodoPago || 'N/A',
      cantidadProductos: response.cantidadProductos || 0,
    };
  }

  /**
   * Reordena los productos de un pedido
   */
  reordenarCompra(compraId: string): Observable<{ success: boolean; mensaje: string }> {
    return this.http.post<{ success: boolean; mensaje: string }>(`${this.apiUrl}/${compraId}/reordenar`, {}).pipe(
      catchError(error => {
        console.error('Error al reordenar:', error);
        return of({ success: false, mensaje: 'Error al reordenar la compra' });
      })
    );
  }

  /**
   * Descargar factura en PDF
   */
  descargarFactura(compraId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${compraId}/factura`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    }).pipe(
      catchError(error => {
        console.error('Error al descargar factura:', error);
        throw error;
      })
    );
  }
  /**
   * Obtiene el detalle completo de un pedido por ID.
   * GET /api/pedidos/{id}
   */
  obtenerDetallePedido(id: number | string): Observable<PedidoDetalleResponse> {
    return this.http.get<PedidoDetalleResponse>(`${this.apiUrl}/${id}`).pipe(
      // 🛑 PUNTO DE VERIFICACIÓN (TAP)
      tap(response => {
        console.log(`✅ BACKEND DATA (Detalle Pedido ${id}):`, response);
      })
    );
  }
}