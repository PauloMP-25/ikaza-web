export interface ProductoInventario {
    idProducto: number;
    nombreProducto: string;
    sku: string;
    stock: number;
    precio: number;
}

// Response del backend para inventario
export interface InventarioResponse {
    idInventario: number;
    idProducto: number;
    nombreProducto: string;
    stockActual: number;
    stockReservado: number;
    stockDisponible: number;
    necesitaReposicion: boolean;
}

// Interfaz para un Movimiento de Stock
// Movimiento de inventario según backend
export interface MovimientoInventario {
    idMovimiento?: number;
    idProducto: number;
    tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
    cantidad: number;
    stockAnterior: number;
    stockNuevo: number;
    motivo: string;
    fechaMovimiento: string;
}

// Interfaz para el formulario de ajuste de stock
// Request para ajustar stock (admin)
export interface AjusteStockRequest {
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    cantidad: number;
    motivo: string;
}