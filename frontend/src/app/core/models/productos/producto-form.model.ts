// src/app/core/models/productos/producto-form.model.ts

/**
 * Modelo para el formulario de productos en el panel de administración
 * Combina datos de ProductoRequest con propiedades temporales del formulario
 */
export interface ProductoFormData {
    // Campos básicos (PostgreSQL)
    idCategoria: number;
    nombreProducto: string;
    descripcionProducto?: string;
    precio: number;
    stock: number;
    stockMinimo?: number;

    // Detalles extendidos (MongoDB)
    codigo?: string;
    marca?: string;

    // Variantes (MongoDB)
    variantes?: VarianteForm[];

    // Atributos dinámicos (MongoDB)
    atributos?: { [key: string]: string };

    // Imágenes (MongoDB)
    imagenesUrls?: string[];

    // Propiedades temporales solo para el formulario (NO SE ENVÍAN AL BACKEND)
    imagenFile?: File;
    imagenFileName?: string;
    imagenPreview?: string;

    // Flags para variantes
    tieneVariantes: boolean;
}

/**
* Estructura de variante para el formulario
*/
export interface VarianteForm {
    sku?: string;
    color?: string;
    talla?: string;
    material?: string;
    stockAdicional: number;
    imagenUrl?: string;
}

/**
 * Helper para convertir ProductoDetalle a ProductoFormData
 */
export function productoDetalleToFormData(producto: any): ProductoFormData {
    return {
        idCategoria: producto.idCategoria,
        nombreProducto: producto.nombreProducto,
        descripcionProducto: producto.descripcionProducto,
        precio: producto.precio,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo,
        codigo: producto.codigo,
        marca: producto.marca,
        variantes: producto.variantes || [],
        atributos: producto.atributos || {},
        imagenesUrls: producto.imagenes?.map((img: any) => img.url) ||
            (producto.imagenPrincipal ? [producto.imagenPrincipal] : []),
        tieneVariantes: !!(producto.variantes && producto.variantes.length > 0),
        imagenPreview: producto.imagenPrincipal || producto.imagenes?.[0]?.url
    };
}

/**
 * Helper para convertir ProductoFormData a ProductoRequest
 */
export function formDataToProductoRequest(formData: ProductoFormData): any {
    return {
        idCategoria: formData.idCategoria,
        nombreProducto: formData.nombreProducto,
        descripcionProducto: formData.descripcionProducto,
        precio: formData.precio,
        stock: formData.stock,
        stockMinimo: formData.stockMinimo,
        codigo: formData.codigo,
        marca: formData.marca,
        imagenesUrls: formData.imagenesUrls,
        atributos: formData.atributos
    };
}