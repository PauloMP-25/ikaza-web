package pe.com.ikaza.backend.dto.response;

import lombok.Builder;
import lombok.Data;
/**
 * DTO de respuesta de la creacion de preferencia de mercado pago.
 */
@Data
@Builder
public class PreferenciaMercadoPagoResponse {
    private String preference_id;
    private String preference_url;
    private Long pedidoId;
}