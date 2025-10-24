package pe.com.ikaza.backend.model.internal;

import lombok.Builder;
import lombok.Data;
import pe.com.ikaza.backend.enums.EstadoPago;
import pe.com.ikaza.backend.enums.MetodoPago;

@Builder
@Data
public class ResultadoPago {
    private boolean exitoso;
    private String transaccionId;
    private String urlRedireccion;
    private boolean requiereRedireccion;
    private EstadoPago estadoPago;
    private MetodoPago metodoPago;
    private String datosJson;
    private Long pedidoIdPreliminar;
}