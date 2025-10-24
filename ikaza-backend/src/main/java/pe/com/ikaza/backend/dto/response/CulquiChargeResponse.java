package pe.com.ikaza.backend.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CulquiChargeResponse {

    private boolean success;
    private JsonNode data;
    private String error;
    private String transactionId;
}
