import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { ProductoService } from './producto.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Producto, ProductoDetalle } from '@core/models/productos/producto-backend.model';
import { Product, ProductAdapterService } from './producto-adapter.service';


@Injectable({
    providedIn: 'root'
})
export class ProductoManagementService {
    private productoService = inject(ProductoService);
    private cloudinaryService = inject(CloudinaryService);
    private adapterService = inject(ProductAdapterService);



    // MÉTODO PRINCIPAL: AGREGAR PRODUCTO

    // Recibe un objeto Product con toda la información del producto.
    // 1. Prepara los datos para el backend (limpia y estructura).
    // 2. Si existe una imagen local, la sube a Cloudinary.
    // 3. Una vez subida, guarda el producto final en la API.
    public addProduct(producto: Product): Observable<Producto> {
        const productoAEnviar = this.prepareProductForApi(producto);

        const upload$ = productoAEnviar.imagenFile instanceof File
            ? this.cloudinaryService.subirImagen(productoAEnviar.imagenFile, productoAEnviar.category.toLowerCase())
            : of(null);

        return upload$.pipe(
            switchMap(uploadResult => {
                if (uploadResult && uploadResult.secure_url) {
                    productoAEnviar.image = uploadResult.secure_url;
                } else if (!productoAEnviar.image) {
                    productoAEnviar.image = '';
                }

                delete productoAEnviar.imagenFile;
                delete productoAEnviar.imagenPreview;
                delete productoAEnviar.imagenFileName;

                // Convertir a ProductoRequest usando el adapter
                const productoRequest = this.adapterService.productToProductoRequest(productoAEnviar);
                return this.productoService.crearProducto(productoRequest);
            })
        );
    }


    // MÉTODO PRINCIPAL: EDITAR PRODUCTO
    // Recibe un producto con modificaciones. 
    // 1. Si el usuario cambió la imagen, la sube primero.
    // 2. Luego, envía la información actualizada a la API.
    public updateProduct(producto: Product): Observable<Producto> {
        const productoAEnviar = this.prepareProductForApi(producto);

        const upload$ = productoAEnviar.imagenFile instanceof File
            ? this.cloudinaryService.subirImagen(productoAEnviar.imagenFile, productoAEnviar.category.toLowerCase())
            : of(null);

        return upload$.pipe(
            switchMap(uploadResult => {
                if (uploadResult && uploadResult.secure_url) {
                    productoAEnviar.image = uploadResult.secure_url;
                }

                delete productoAEnviar.imagenFile;
                delete productoAEnviar.imagenPreview;
                delete productoAEnviar.imagenFileName;

                // Convertir a ProductoUpdateRequest usando el adapter
                const productoUpdateRequest = this.adapterService.productToProductoUpdateRequest(productoAEnviar);
                return this.productoService.actualizarProducto(productoAEnviar.id, productoUpdateRequest);
            })
        );
    }

    // Obtener producto como modelo v2
    public getProductAsV2(productoDetalle: ProductoDetalle): Product {
        return this.adapterService.productoDetalleToProduct(productoDetalle);
    }


    // FUNCIÓN INTERNA DE PREPARACIÓN DE DATOS
    private prepareProductForApi(producto: Product): Product {
        const productoAEnviar = { ...producto };

        productoAEnviar.hasSizes = (productoAEnviar.sizes && productoAEnviar.sizes.length > 0) || false;
        productoAEnviar.hasColors = (productoAEnviar.colors && productoAEnviar.colors.length > 0) || false;

        return productoAEnviar;
    }
}
