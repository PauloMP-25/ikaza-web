package pe.com.ikaza.backend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@Transactional
public class CulqiService{

    @Value("${culqi.secret.key}")
    private String culqiSecretKey;

    private static final String CULQI_API_URL = "https://api.culqi.com/v2/charges";
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public CulqiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Crea un cargo en Culqi usando el token generado en el frontend.
     * 
     * @param token Token de Culqi generado en el cliente
     * @param monto Monto en centavos (100 = S/ 1.00)
     * @param email Email del usuario
     * @return JsonNode con la respuesta de Culqi
     */
    public JsonNode crearCargo(String token, BigDecimal monto, String email) {
        try {
            log.info("Iniciando cargo en Culqi. Monto: {}, Email: {}", monto, email);

            // Convertir monto a centavos
            int montoCentavos = monto.multiply(BigDecimal.valueOf(100)).intValue();

            // Construir payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("amount", montoCentavos);
            payload.put("currency_code", "PEN");
            payload.put("source_id", token);
            payload.put("email", email);
            payload.put("description", "Ikaza-Imports");

            // Configurar headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(culqiSecretKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            // Hacer petición a Culqi
            ResponseEntity<String> response = restTemplate.postForEntity(
                CULQI_API_URL, 
                request, 
                String.class
            );

            JsonNode responseJson = objectMapper.readTree(response.getBody());

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Cargo exitoso en Culqi. Transaction ID: {}", 
                    responseJson.get("id").asText());
                return responseJson;
            } else {
                log.error("Error en Culqi: {}", responseJson);
                throw new RuntimeException("Error al procesar el pago con Culqi");
            }

        } catch (Exception e) {
            log.error("Error al crear cargo en Culqi", e);
            throw new RuntimeException("Error al procesar el pago: " + e.getMessage());
        }
    }

    /**
     * Valida un token de Culqi antes de procesarlo.
     */
    public boolean validarToken(String token) {
        return token != null && token.startsWith("tkn_");
    }
}
