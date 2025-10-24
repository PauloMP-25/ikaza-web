// src/app/core/models/pedidos/compra.model.ts

/**
 * Define la estructura mínima de un ítem de producto para el listado del historial
 * (Usado para obtenerResumenProductos y mostrar imágenes/cantidad en la tabla).
 */
export interface ProductoCompra {
    id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    imagen?: string;
}

/**
 * Define la estructura de una Compra para el estado local del componente (comprasOriginales).
 * Contiene solo los campos necesarios para la tabla, filtros y ordenamiento.
 */
export interface Compra {
    id: string; // Mapeado de pedidoId
    numeroPedido: string;
    fecha: Date | string; // Mapeado de fechaPedido
    estado: 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado' | 'devuelto' | 'desconocido';
    total: number; // Mapeado de total
    metodoPago: string; // Mapeado de metodoPago
    cantidadProductos: number;
}

/**
 * Interfaz para los botones de filtro por fecha.
 */
export interface FiltroFecha {
    valor: string;
    nombre: string;
    icono: string;
    contador: number;
}

/**
 * Interfaz para la función obtenerComprasUsuario.
 */
export interface FiltrosCompra {
    fechaInicio?: Date;
    fechaFin?: Date;
    estado?: string;
    terminoBusqueda?: string;
    pagina?: number;
    limite?: number;
}