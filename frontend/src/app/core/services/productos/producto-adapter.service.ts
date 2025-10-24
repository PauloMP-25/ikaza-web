// src/app/core/models/productos/product-adapters.model.ts
import { ProductoDetalle, Variante, ImagenProducto } from '@core/models/productos/producto-backend.model';

export interface SizeOption {
    name_size: string;
    value_size: string;
}

export interface ColorOption {
    name_color: string;
    value_color: string;
}

export interface Product {
    // Propiedades de la API/MOCK
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    category: string;
    description: string;
    estado: boolean;
    dateAdded: Date;
    image: string;
    activarPrecioPorPaquete?: boolean;
    precioPorPaquete?: number;

    // Flags y Variaciones
    hasSizes: boolean;
    hasColors: boolean;
    sizes?: SizeOption[];
    colors?: ColorOption[];

    // Propiedades temporales (solo Front-end)
    imagenFile?: File;
    imagenFileName?: string;
    imagenPreview?: string;

    // Propiedades adicionales para compatibilidad
    marca?: string;
    modelo?: string;
    codigo?: string;
}

// Servicio de mapeo
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ProductAdapterService {

    /**
     * Convierte ProductoDetalle (modelo principal) a Product (modelo v2)
     */
    productoDetalleToProduct(productoDetalle: ProductoDetalle): Product {
        // Extraer variantes para hasSizes y hasColors
        const hasSizes = this.hasSizes(productoDetalle.variantes);
        const hasColors = this.hasColors(productoDetalle.variantes);

        // Extraer tallas y colores únicos de las variantes
        const sizes = this.extractSizes(productoDetalle.variantes);
        const colors = this.extractColors(productoDetalle.variantes);

        return {
            id: productoDetalle.idProducto,
            name: productoDetalle.nombreProducto,
            sku: productoDetalle.codigo || '',
            price: productoDetalle.precio,
            stock: productoDetalle.stock,
            category: productoDetalle.nombreCategoria,
            description: productoDetalle.descripcionProducto,
            estado: productoDetalle.disponible,
            dateAdded: new Date(productoDetalle.fechaCreacion),
            image: productoDetalle.imagenPrincipal || this.getMainImage(productoDetalle.imagenes),
            marca: productoDetalle.marca,
            modelo: productoDetalle.modelo,
            codigo: productoDetalle.codigo,

            // Flags de variantes
            hasSizes,
            hasColors,
            sizes,
            colors,

            // Propiedades opcionales (pueden ser configuradas después)
            activarPrecioPorPaquete: false,
            precioPorPaquete: 0
        };
    }

    /**
     * Convierte Product (modelo v2) a ProductoRequest para el backend
     */
    productToProductoRequest(product: Product): any {
        const request: any = {
            idCategoria: this.getCategoryId(product.category), // Necesitarás mapear categorías a IDs
            nombreProducto: product.name,
            descripcionProducto: product.description,
            precio: product.price,
            stock: product.stock,
            codigo: product.sku,
            marca: product.marca,
            modelo: product.modelo
        };

        // Si hay imagen, agregar a las URLs
        if (product.image) {
            request.imagenesUrls = [product.image];
        }

        // Si hay variantes, procesarlas
        if (product.hasSizes || product.hasColors) {
            request.variantes = this.generateVariantes(product);
        }

        return request;
    }

    /**
     * Convierte Product (modelo v2) a ProductoUpdateRequest
     */
    productToProductoUpdateRequest(product: Product): any {
        return {
            idCategoria: this.getCategoryId(product.category),
            nombreProducto: product.name,
            descripcionProducto: product.description,
            precio: product.price,
            stock: product.stock,
            codigo: product.sku,
            marca: product.marca,
            modelo: product.modelo
        };
    }

    /**
     * Genera variantes a partir de los sizes y colors del Product
     */
    private generateVariantes(product: Product): Partial<Variante>[] {
        const variantes: Partial<Variante>[] = [];

        if (product.hasSizes && product.sizes) {
            for (const size of product.sizes) {
                variantes.push({
                    talla: size.value_size,
                    sku: `${product.sku}-${size.value_size}`,
                    stockAdicional: 0
                });
            }
        }

        if (product.hasColors && product.colors) {
            for (const color of product.colors) {
                variantes.push({
                    color: color.value_color,
                    sku: `${product.sku}-${color.value_color}`,
                    stockAdicional: 0
                });
            }
        }

        // Si tiene ambos, crear combinaciones
        if (product.hasSizes && product.hasColors && product.sizes && product.colors) {
            variantes.length = 0; // Limpiar las anteriores
            for (const size of product.sizes) {
                for (const color of product.colors) {
                    variantes.push({
                        talla: size.value_size,
                        color: color.value_color,
                        sku: `${product.sku}-${size.value_size}-${color.value_color}`,
                        stockAdicional: 0
                    });
                }
            }
        }

        return variantes;
    }

    /**
     * Extrae si el producto tiene tallas
     */
    private hasSizes(variantes?: Variante[]): boolean {
        return !!variantes && variantes.some(v => v.talla && v.talla.trim() !== '');
    }

    /**
     * Extrae si el producto tiene colores
     */
    private hasColors(variantes?: Variante[]): boolean {
        return !!variantes && variantes.some(v => v.color && v.color.trim() !== '');
    }

    /**
     * Extrae tallas únicas de las variantes
     */
    private extractSizes(variantes?: Variante[]): SizeOption[] {
        if (!variantes) return [];

        const sizes = new Set<string>();
        variantes.forEach(v => {
            if (v.talla && v.talla.trim() !== '') {
                sizes.add(v.talla);
            }
        });

        return Array.from(sizes).map(size => ({
            name_size: size,
            value_size: size
        }));
    }

    /**
     * Extrae colores únicos de las variantes
     */
    private extractColors(variantes?: Variante[]): ColorOption[] {
        if (!variantes) return [];

        const colors = new Set<string>();
        variantes.forEach(v => {
            if (v.color && v.color.trim() !== '') {
                colors.add(v.color);
            }
        });

        return Array.from(colors).map(color => ({
            name_color: color,
            value_color: color
        }));
    }

    /**
     * Obtiene la imagen principal
     */
    private getMainImage(imagenes?: ImagenProducto[]): string {
        if (!imagenes || imagenes.length === 0) return '';

        const principal = imagenes.find(img => img.esPrincipal);
        return principal ? principal.url : imagenes[0].url;
    }

    /**
     * Mapea nombre de categoría a ID (necesitarás implementar esta lógica)
     */
    private getCategoryId(categoryName: string): number {
        // Aquí necesitas mapear el nombre de categoría a ID
        // Puedes usar un servicio de categorías o un mapa estático
        const categoryMap: { [key: string]: number } = {
            'electrónica': 1,
            'ropa': 2,
            'hogar': 3,
            'muebles': 4
        };

        return categoryMap[categoryName.toLowerCase()] || 1;
    }
}