import { Injectable } from '@angular/core';
import { Producto, ProductoDetalle, Variante } from '@core/models/productos/producto-backend.model';
import { CartItem } from '@core/models/carrito/cart-item';
import { NotificacionService } from '../notificaciones/servicio-notificacion';

@Injectable({
    providedIn: 'root'
})
export class ProductUtilsService {

    constructor(private notificacionService: NotificacionService) { }

    // ========================================
    // CONSTRUCCIÓN DE ITEMS DEL CARRITO
    // ========================================

    /**
     * Construye un CartItem listo para agregar al carrito.
     * La variante es opcional. Si se proporciona, se usa la información detallada (SKU, color, talla).
     * Si no se proporciona, se usa la información del producto base.
     * @param product El producto base (ProductoDetalle o Producto).
     * @param selectedVariant La variante específica seleccionada (Opcional).
     * @param qty Cantidad a añadir.
     */
    buildCartProduct(
        product: Producto,
        selectedVariant?: Variante,
        qty: number = 1
    ): CartItem {

        // 1. Determinar el precio final y la imagen
        const finalPrice = product.precio;
        const finalImage = selectedVariant?.imagenUrl || product.imagenPrincipal;

        // 2. Construir el CartItem base
        let cartItem: CartItem = {
            ...product,
            qty,
            precio: finalPrice,
            image: finalImage
        };

        // 3. Si existe una variante, agregamos sus propiedades específicas
        if (selectedVariant) {
            cartItem = {
                ...cartItem, // 👈 Copiamos el item base (que ya tiene el precio/imagen de la variante)
                sku: selectedVariant.sku,
                color: selectedVariant.color,
                size: selectedVariant.talla,
                material: selectedVariant.material,
            };
        }
        return cartItem;
    }

    // ========================================
    // VALIDACIONES
    // ========================================

    /**
     * Valida stock antes de agregar al carrito
     * Ahora asume que el producto base tiene el stock agregado de todas sus variantes
     * o que se valida contra el stock de la variante seleccionada.
     * * NOTA: Esta función DEBERÍA recibir la variante para validar su stock.
     */
    validateStock(product: Producto, selectedVariant?: Variante): boolean {
        //Validar contra el stock de la variante seleccionada
        if (selectedVariant) {
            const stockToCheck = selectedVariant.stockAdicional; // o el campo de stock que uses en Variante
            if (stockToCheck <= 0) {
                this.showErrorMessage(`${product.nombreProducto} (Variante ${selectedVariant.sku}) está agotado`);
                return false;
            }
        } else {
            // Si no hay variantes, se valida contra el stock del producto base.
            if (product.stock <= 0) {
                this.showErrorMessage(`${product.nombreProducto} está agotado`);
                return false;
            }
        }
        return true;
    }

    /**
     * Verifica si un producto tiene variantes
     */
    hasVariants(product: ProductoDetalle): boolean {
        return !!(product.variantes && product.variantes.length > 0);
    }


    // ========================================
    // FILTRADO Y BÚSQUEDA (FRONTEND)
    // ========================================

    /**
     * Filtra productos por término de búsqueda
     */
    filterProducts<T extends Producto>(products: T[], searchTerm: string): T[] {
        if (!searchTerm.trim()) return [...products];

        const term = searchTerm.toLowerCase();
        return products.filter(p =>
            p.nombreProducto.toLowerCase().includes(term) ||
            p.descripcionProducto.toLowerCase().includes(term) ||
            p.nombreCategoria.toLowerCase().includes(term)
        );
    }

    // ========================================
    // UTILIDADES DE UI
    // ========================================

    /**
     * Divide productos en chunks para carruseles
     */
    chunkProducts<T>(products: T[], chunkSize: number = 4): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < products.length; i += chunkSize) {
            chunks.push(products.slice(i, i + chunkSize));
        }
        return chunks;
    }



    /**
     * Calcula días desde una fecha
     */
    calculateDaysSince(date: Date | undefined): string {
        if (!date) return 'Hoy';

        const today = new Date();
        const diffTime = Math.abs(today.getTime() - new Date(date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
        return `Hace ${Math.floor(diffDays / 30)} meses`;
    }

    // ========================================
    // NOTIFICACIONES
    // ========================================

    /**
    * Muestra un TOAST de notificación de éxito al añadir al carrito.
    * Objetivo: Construir el mensaje FINAL (incluyendo variantes si existen)
    * y luego enviarlo al NotificacionService como un simple string.
    * @param productName Nombre del producto base.
    * @param selectedVariant Es OPCIONAL, contiene color/talla/sku.
    */
    showToast(
        productName: string,
        selectedVariant?: Variante,
    ): void {
        let variantInfo = '';

        //Construir el string de información de la variante
        if (selectedVariant) {
            // Si hay variante, construimos el mensaje detallado
            if (selectedVariant.color) variantInfo += selectedVariant.color;
            // Si ya hay info, agrega la coma y la talla. Si no, solo la talla.
            if (selectedVariant.talla) variantInfo += variantInfo ? `, ${selectedVariant.talla}` : selectedVariant.talla;

            // Si no se encontraron color/talla, usa el SKU como fallback.
            if (!variantInfo) variantInfo = selectedVariant.sku || '';

            // Encapsular la info de variante si existe
            if (variantInfo) variantInfo = `(${variantInfo})`;
        }
        // 2. Construir el mensaje final que verá el usuario
        const finalMessage = `${productName} añadido al carrito ${variantInfo}`;

        // 3. Enviar el mensaje FINAL al servicio de notificación
        this.showSuccessMessage(finalMessage);
    }

    /**
     * Muestra una notificación de éxito usando el servicio central.
     */
    showSuccessMessage(message: string): void {
        this.notificacionService.showToast({
            message: message,
            type: 'success',
            duration: 3000
        });
    }

    /**
    * Muestra una notificación de error usando el servicio central.
    */
    showErrorMessage(message: string): void {
        this.notificacionService.showToast({
            message: message,
            type: 'error',
            duration: 4000
        });
    }

    // ========================================
    // FORMATEO Y UTILIDADES
    // ========================================

    formatPrice(price: number, currency: string = 'S/.'): string {
        return `${currency}${price.toFixed(2)}`;
    }

    getStockStatus(stock: number): { text: string; class: string } {
        if (stock === 0) {
            return { text: 'Agotado', class: 'bg-danger' };
        } else if (stock < 10) {
            return { text: `Stock: ${stock}`, class: 'bg-warning' };
        } else {
            return { text: `Stock: ${stock}`, class: 'bg-success' };
        }
    }

}
