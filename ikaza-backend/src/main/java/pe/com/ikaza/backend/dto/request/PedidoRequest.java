package pe.com.ikaza.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

/**
 * DTO principal que recibe el frontend en el checkout.
 * Contiene toda la información necesaria para procesar un pedido.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PedidoRequest {
    // El idUsuario se extraerá del JWT en el controlador
    // pero puede venir en el DTO como validación adicional
    private Long idUsuario;

    @NotEmpty(message = "El carrito no puede estar vacío")
    @Valid
    private List<ItemPedidoRequest> cartItems;

    @NotNull(message = "El total es obligatorio")
    private BigDecimal total;

    private BigDecimal subtotal;

    @NotNull(message = "El método de pago es obligatorio")
    private String metodoPago; // "MERCADO_PAGO", "CULQI", "TRANSFERENCIA_BANCARIA", etc.

    // Token de Culqi (solo si metodoPago == "CULQI")
    private String tokenCulqi;

    //ID de la tarjeta guardada al pedido.
    private Integer idTarjetaGuardada;

    // Email del usuario (para notificaciones)
    private String email;

    // Información adicional (opcional)
    private String notasAdicionales;
}
