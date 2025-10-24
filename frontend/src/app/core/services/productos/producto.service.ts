// src/app/services/productos/producto.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
    Producto,
    PageResponse,
    ProductoDetalle,
    ProductoRequest,
    ProductoUpdateRequest,
    // Se eliminan Variante e ImagenProducto ya que eran solo para mocks
} from '@core/models/productos/producto-backend.model';

@Injectable({
    providedIn: 'root'
})
export class ProductoService {
    private http = inject(HttpClient);
    // URL base de la API de productos
    private apiUrl = `${environment.apiUrl}/api/productos`;


    /**
     * Manejador de errores centralizado para las llamadas a la API.
     * @param error El error retornado por HttpClient.
     * @returns Un Observable que emite un error.
     */
    private handleError(error: any): Observable<never> {
        console.error('Ocurrió un error en la API de productos:', error);
        // Se puede personalizar la lógica de manejo de errores aquí
        // Por ejemplo: mostrar una notificación, registrar en un servicio externo, etc.
        return throwError(() => new Error(`Error en el servicio de productos: ${error.message}`));
    }

    // --- MÉTODOS DE LECTURA (PÚBLICOS) ---

    /**
     * Obtener productos con paginación
     */
    obtenerProductos(
        page: number = 0,
        size: number = 20,
        sort: string = 'nombreProducto',
        direction: string = 'ASC'
    ): Observable<PageResponse<ProductoDetalle>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', sort)
            .set('direction', direction);

        return this.http.get<PageResponse<Producto>>(this.apiUrl, { params }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener productos por categoría
     */
    obtenerProductosPorCategoria(
        idCategoria: number,
        page: number = 0,
        size: number = 20
    ): Observable<PageResponse<Producto>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PageResponse<Producto>>(
            `${this.apiUrl}/categoria/${idCategoria}`,
            { params }
        ).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener producto por ID (datos básicos)
     */
    obtenerProductoPorId(id: number): Observable<Producto> {
        return this.http.get<Producto>(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener detalle completo del producto (incluye variantes, imagenes, etc.)
     */
    obtenerDetalleProducto(id: number): Observable<ProductoDetalle> {
        return this.http.get<ProductoDetalle>(`${this.apiUrl}/${id}/detalle`).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Buscar productos
     */
    buscarProductos(
        texto: string,
        page: number = 0,
        size: number = 20
    ): Observable<PageResponse<Producto>> {
        const params = new HttpParams()
            .set('texto', texto)
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PageResponse<Producto>>(`${this.apiUrl}/buscar`, { params }).pipe(
            catchError(this.handleError)
        );
    }

    // --- MÉTODOS ADMIN (CRUD) ---

    /**
     * Crear producto (admin)
     */
    crearProducto(producto: ProductoRequest): Observable<Producto> {
        return this.http.post<Producto>(this.apiUrl, producto).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Actualizar producto (admin)
     */
    actualizarProducto(id: number, producto: ProductoUpdateRequest): Observable<Producto> {
        return this.http.put<Producto>(`${this.apiUrl}/${id}`, producto).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Eliminar producto (admin)
     */
    eliminarProducto(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener el producto más vendido
     */
    obtenerProductoMasVendido(): Observable<ProductoDetalle | null> {
        return this.http.get<ProductoDetalle>(`${this.apiUrl}/mas-vendido`).pipe(
            catchError((error) => {
                if (error.status === 204) {
                    // No hay contenido (sin productos)
                    return of(null);
                }
                return this.handleError(error);
            })
        );
    }

    /**
 * Obtener productos más baratos
 */
    obtenerProductosMasBaratos(limite: number = 12): Observable<Producto[]> {
        const params = new HttpParams().set('limite', limite.toString());
        return this.http.get<Producto[]>(`${this.apiUrl}/mas-baratos`, { params }).pipe(
            catchError(this.handleError)
        );
    }

    /**
 * Obtener productos más recientes
 */
    obtenerProductosMasRecientes(limite: number = 12): Observable<Producto[]> {
        const params = new HttpParams().set('limite', limite.toString());
        return this.http.get<Producto[]>(`${this.apiUrl}/mas-recientes`, { params }).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener productos por agotarse
     */
    obtenerProductosPorAgotarse(limite: number = 12): Observable<Producto[]> {
        const params = new HttpParams().set('limite', limite.toString());
        return this.http.get<Producto[]>(`${this.apiUrl}/por-agotarse`, { params }).pipe(
            catchError(this.handleError)
        );
    }
}