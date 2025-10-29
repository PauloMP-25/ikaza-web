// src/app/core/services/productos/producto-management.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { ProductoService } from './producto.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Producto, ProductoDetalle, ProductoRequest, ProductoUpdateRequest } from '@core/models/productos/producto-backend.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoManagementService {
  private productoService = inject(ProductoService);
  private cloudinaryService = inject(CloudinaryService);

  /**
   * Agregar producto con imagen opcional
   * @param request - Datos del producto a crear
   * @param imagenFile - Archivo de imagen opcional
   */
  public addProduct(request: ProductoRequest, imagenFile?: File): Observable<Producto> {
    // Si hay imagen, subirla primero
    const upload$ = imagenFile instanceof File
      ? this.cloudinaryService.subirImagen(imagenFile, 'productos')
      : of(null);

    return upload$.pipe(
      switchMap(uploadResult => {
        // Si se subió imagen, agregar URL al request
        if (uploadResult?.secure_url) {
          if (!request.imagenesUrls) {
            request.imagenesUrls = [];
          }
          request.imagenesUrls.unshift(uploadResult.secure_url); // Agregar como primera imagen
        }

        // Crear producto en el backend
        return this.productoService.crearProducto(request);
      })
    );
  }

  /**
   * Actualizar producto con imagen opcional
   * @param id - ID del producto a actualizar
   * @param updateRequest - Datos a actualizar
   * @param imagenFile - Archivo de imagen opcional (reemplazará la principal)
   */
  public updateProduct(
    id: number,
    updateRequest: ProductoUpdateRequest,
    imagenFile?: File
  ): Observable<Producto> {
    const upload$ = imagenFile instanceof File
      ? this.cloudinaryService.subirImagen(imagenFile, 'productos')
      : of(null);

    return upload$.pipe(
      switchMap(uploadResult => {
        // Nota: La lógica de actualización de imagen principal 
        // debería manejarse en el backend (MongoDB)
        // Aquí solo enviamos los datos básicos de PostgreSQL

        return this.productoService.actualizarProducto(id, updateRequest);
      })
    );
  }

  /**
   * Eliminar producto
   */
  public deleteProduct(id: number): Observable<any> {
    return this.productoService.eliminarProducto(id);
  }
}