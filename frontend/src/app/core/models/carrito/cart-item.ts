// Interface para items en carrito (extiende Product con qty y variantes)
import { Producto } from "../productos/producto-backend.model";

export interface CartItem extends Producto {
    // Campos heredados de Producto (id, name, price, category, etc.)
    qty: number;
    // Datos específicos de la variante seleccionada
    sku?: string;
    color?: string; // Nombre del color
    size?: string; // Nombre de la talla
    material?: string;
    image?: string; // URL de la imagen de la variante
    idVariante?: number; // Si necesitas el ID de la tabla Variante
}