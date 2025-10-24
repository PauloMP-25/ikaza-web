package pe.com.ikaza.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PreferenciaMercadoPagoResponse {
    private String preference_id;
    private String preference_url;
    private Long pedidoId; // ID del pedido preliminar creado
}