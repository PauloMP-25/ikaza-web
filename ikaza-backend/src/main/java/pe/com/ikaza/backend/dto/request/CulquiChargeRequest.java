package pe.com.ikaza.backend.dto.request;

import lombok.Data;

@Data
public class CulquiChargeRequest {
    private String token; // Token generado en el frontend
    private Integer amount; // Monto en centavos
}
