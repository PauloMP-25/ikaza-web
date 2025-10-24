package pe.com.ikaza.backend.dto.response;

import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Se debe extender de PedidoResponse heredar los campos básicos
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class PedidoDetalleResponse extends PedidoResponse {

    // Lista de ítems (productos comprados)
    private List<ItemDetalleResponse> detalles;

    // Información de Pago Snapshot
    private String ultimos4DigitosTarjeta;
    private String tipoTarjeta;
    private String bancoEmisor;
    private LocalDateTime fechaPago; // Fecha real de la entidad Pago

    // Información de envío (Asumiendo que es una dirección)
    private String direccionEnvioCompleta;
    private String telefonoContacto;

    // Usar el constructor base (del DTO padre) si no usas @SuperBuilder
    @Builder(builderMethodName = "detalleBuilder")
    public PedidoDetalleResponse(
            boolean success, String mensaje, Long pedidoId, String numeroPedido, String transaccionId,
            String redirectionUrl, String estadoPedido, String estadoPago, String metodoPago,
            BigDecimal total, BigDecimal subtotal, LocalDateTime fechaPedido, Integer cantidadProductos,
            List<ItemDetalleResponse> detalles, String ultimos4DigitosTarjeta, String tipoTarjeta,
            String bancoEmisor, LocalDateTime fechaPago, String direccionEnvioCompleta, String telefonoContacto) {

        super(success, mensaje, pedidoId, numeroPedido, transaccionId, redirectionUrl,
                estadoPedido, estadoPago, metodoPago, total, subtotal, fechaPedido, cantidadProductos);

        this.detalles = detalles;
        this.ultimos4DigitosTarjeta = ultimos4DigitosTarjeta;
        this.tipoTarjeta = tipoTarjeta;
        this.bancoEmisor = bancoEmisor;
        this.fechaPago = fechaPago;
        this.direccionEnvioCompleta = direccionEnvioCompleta;
        this.telefonoContacto = telefonoContacto;
    }
}
