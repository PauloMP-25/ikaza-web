// src/app/core/services/checkout/checkout.service.ts (o un archivo dedicado de modelos)
export interface ItemPedido {
    idProducto: number;
    cantidad: number;
    precioUnitario: number;
    nombreProducto: string;
    color?: string;
    talla?: string;
    sku?: string;
    imagenUrl?: string;
}

export interface PedidoRequest {
    idUsuario?: number;
    cartItems: ItemPedido[];
    total: number;
    subtotal: number;
    metodoPago: string; //"MERCADO_PAGO", "CULQI", etc.
    tokenCulqi?: string;
    idTarjetaGuardada?: number;
    email: string;
    notasAdicionales?: string;
}

export interface PedidoResponse {
    success: boolean;
    mensaje: string;
    pedidoId?: number;
    numeroPedido?: string;
    transaccionId?: string;
    redirectionUrl?: string; // Para Mercado Pago
    estadoPedido?: string;
    estadoPago?: string;
    metodoPago?: string;
    total?: number;
    subtotal?: number;
    fechaPedido?: string;
    cantidadProductos?: number;
}

export interface ItemDetalleResponse {
    idProducto: number;
    nombreProducto: string;
    imagenUrl: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    colorSeleccionado?: string;
    tallaSeleccionada?: string;
}

/**
 * Interfaz completa para el detalle de un solo pedido (la "factura").
 * Extiende PedidoResponse (Fase 1).
 */
export interface PedidoDetalleResponse extends PedidoResponse {
    // Campos del detalle
    detalles: ItemDetalleResponse[];

    // Información de Pago Snapshot
    ultimos4DigitosTarjeta?: string;
    tipoTarjeta?: string;
    bancoEmisor?: string;
    fechaPago?: string; // LocalDateTime de Java

    // Información de envío/contacto
    direccionEnvioCompleta: string;
    telefonoContacto: string;
}