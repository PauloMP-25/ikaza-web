import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  InventarioResponse,
  MovimientoInventario,
  AjusteStockRequest
} from '@core/models/inventario/inventario.model';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/inventario`;

  /**
  * Obtiene el inventario de todos los productos
  */
  obtenerInventarios(): Observable<InventarioResponse[]> {
    return this.http.get<InventarioResponse[]>(this.apiUrl);
  }

  /**
     * Obtiene el inventario de un producto específico
     */
  obtenerInventarioPorProducto(idProducto: number): Observable<InventarioResponse> {
    return this.http.get<InventarioResponse>(`${this.apiUrl}/producto/${idProducto}`);
  }

  /**
   * Obtiene el historial de movimientos de un producto
   */
  obtenerMovimientosPorProducto(idProducto: number): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(
      `${this.apiUrl}/movimientos/producto/${idProducto}`
    );
  }


  /**
       * Registra un ajuste de stock (entrada o salida)
       * El backend se encarga de crear el movimiento y actualizar el inventario
       */
  ajustarStock(idProducto: number, ajuste: AjusteStockRequest): Observable<InventarioResponse> {
    return this.http.post<InventarioResponse>(
      `${this.apiUrl}/producto/${idProducto}/ajustar`,
      ajuste
    );
  }

  /**
   * Obtiene inventarios con stock bajo
   */
  obtenerInventariosConStockBajo(): Observable<InventarioResponse[]> {
    return this.http.get<InventarioResponse[]>(`${this.apiUrl}/stock-bajo`);
  }

  /**
   * Obtiene inventarios sin stock
   */
  obtenerInventariosSinStock(): Observable<InventarioResponse[]> {
    return this.http.get<InventarioResponse[]>(`${this.apiUrl}/sin-stock`);
  }

  /**
   * Obtiene últimos movimientos del sistema
   */
  obtenerUltimosMovimientos(limite: number = 50): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(
      `${this.apiUrl}/movimientos/ultimos?limite=${limite}`
    );
  }
}
