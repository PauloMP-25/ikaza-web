// src/app/core/services/productos/producto-management.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap, catchError, throwError } from 'rxjs';
import { ProductoService } from './producto.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Producto, ProductoDetalle, ProductoRequest, ProductoUpdateRequest } from '@core/models/productos/producto-backend.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoManagementService {
  private productoService = inject(ProductoService);
  private cloudinaryService = inject(CloudinaryService);
  private adapterService = inject(ProductAdapterService);

  // 🟢 AGREGAR PRODUCTO
  public addProduct(producto: Product): Observable<Producto> {
    const productoAEnviar = { ...producto }; //26 DE OCTUBRE


    const upload$ = productoAEnviar.imagenFile instanceof File
      ? this.cloudinaryService.subirImagen(productoAEnviar.imagenFile, productoAEnviar.category.toLowerCase())
      : of(null);

    return upload$.pipe(
      switchMap(uploadResult => {
        //AGREGADO EL 26 DE OCTUBRE
if (uploadResult?.secure_url) {
  productoAEnviar.image = uploadResult.secure_url;

  // ✅ Agregamos el campo que el backend espera:
  (productoAEnviar as any).imagenPrincipal = uploadResult.secure_url;
} else {
  productoAEnviar.image ||= '';
  (productoAEnviar as any).imagenPrincipal ||= '';
}

        //

        delete productoAEnviar.imagenFile;
        delete productoAEnviar.imagenPreview;
        delete productoAEnviar.imagenFileName;

        const productoRequest = this.adapterService.productToProductoRequest(productoAEnviar);
        return this.productoService.crearProducto(productoRequest);
      }),
      catchError(err => this.handleError('Error al agregar producto', err))
    );
  }

  // 🟡 EDITAR PRODUCTO
  public updateProduct(producto: Product): Observable<Producto> {
    const productoAEnviar = this.prepareProductForApi(producto);

    if (!productoAEnviar.id) {
      return throwError(() => new Error('El producto a actualizar no tiene ID definido.'));
    }

    const upload$ = productoAEnviar.imagenFile instanceof File
      ? this.cloudinaryService.subirImagen(productoAEnviar.imagenFile, productoAEnviar.category.toLowerCase())
      : of(null);

    return upload$.pipe(
      switchMap(uploadResult => {
        if (uploadResult?.secure_url) {
          productoAEnviar.image = uploadResult.secure_url;
        }

        delete productoAEnviar.imagenFile;
        delete productoAEnviar.imagenPreview;
        delete productoAEnviar.imagenFileName;

        const productoUpdateRequest = this.adapterService.productToProductoUpdateRequest(productoAEnviar);
        return this.productoService.actualizarProducto(productoAEnviar.id, productoUpdateRequest);
      }),
      catchError(err => this.handleError('Error al actualizar producto', err))
    );
  }

  // 🔄 CONVERTIR A MODELO v2
  public getProductAsV2(productoDetalle: ProductoDetalle): Product {
    return this.adapterService.productoDetalleToProduct(productoDetalle);
  }

  // ⚙️ PREPARAR DATOS PARA API
  private prepareProductForApi(producto: Product): Product {
    const productoAEnviar = { ...producto };
    productoAEnviar.hasSizes = Boolean(productoAEnviar.sizes?.length);
    productoAEnviar.hasColors = Boolean(productoAEnviar.colors?.length);
    return productoAEnviar;
  }

  // ❌ MANEJO CENTRALIZADO DE ERRORES (sin librerías externas)
  private handleError(mensaje: string, error: any): Observable<never> {
    console.error(`${mensaje}:`, error);

    // Mostrar mensaje de error básico con alert()
    alert(`${mensaje}. Por favor, inténtalo nuevamente.`);

    return throwError(() => error);
  }
}
