package pe.com.ikaza.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de respuesta enviado al frontend después del checkout.
 * Incluye información del pedido creado y URLs de redirección si aplica.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedidoResponse {

    private boolean success;
    
    private String mensaje;
    
    private Long pedidoId;
    
    private String numeroPedido;
    
    private String transaccionId; // ID de Culqi o Mercado Pago
    
    // URL de redirección para Mercado Pago
    private String redirectionUrl;
    
    // Estado del pedido
    private String estadoPedido;
    
    private String estadoPago;
    
    // Información adicional
    private String metodoPago;

    private java.math.BigDecimal total; 
    private java.math.BigDecimal subtotal;
    private java.time.LocalDateTime fechaPedido; 
    private Integer cantidadProductos; 
    
    // Constructor para respuesta exitosa con redirección (Mercado Pago)
    public static PedidoResponse exitoConRedireccion(
            Long pedidoId, 
            String numeroPedido, 
            String redirectionUrl,
            String mensaje) {
        return PedidoResponse.builder()
                .success(true)
                .pedidoId(pedidoId)
                .numeroPedido(numeroPedido)
                .redirectionUrl(redirectionUrl)
                .estadoPedido("PENDIENTE")
                .estadoPago("PENDIENTE")
                .mensaje(mensaje)
                .build();
    }
    
    // Constructor para respuesta exitosa síncrona (Culqi)
    public static PedidoResponse exitoSincrono(
            Long pedidoId, 
            String numeroPedido, 
            String transaccionId,
            String mensaje) {
        return PedidoResponse.builder()
                .success(true)
                .pedidoId(pedidoId)
                .numeroPedido(numeroPedido)
                .transaccionId(transaccionId)
                .estadoPedido("CONFIRMADO")
                .estadoPago("APROBADO")
                .mensaje(mensaje)
                .build();
    }
    
    // Constructor para respuesta de error
    public static PedidoResponse error(String mensaje) {
        return PedidoResponse.builder()
                .success(false)
                .mensaje(mensaje)
                .build();
    }
}
