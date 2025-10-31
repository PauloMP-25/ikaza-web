package pe.com.ikaza.backend.service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.com.ikaza.backend.dto.request.ItemPedidoRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
@Slf4j
public class MercadoPagoService {

    @Value("${mercadopago.access.token}")
    private String mercadoPagoAccessToken;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    private static final String MP_API_URL = "https://api.mercadopago.com/checkout/preferences";
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public MercadoPagoService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Crea una preferencia de pago en Mercado Pago.
     * 
     * @param items Lista de items del pedido
     * @param pedidoId ID del pedido preliminar (para los back_urls)
     * @return JsonNode con la respuesta de Mercado Pago
     */
    public JsonNode crearPreferencia(List<ItemPedidoRequest> items, Long pedidoId) {
        try {
            log.info("Creando preferencia de Mercado Pago para pedido: {}", pedidoId);

            // Construir items de la preferencia
            List<Map<String, Object>> mpItems = new ArrayList<>();
            for (ItemPedidoRequest item : items) {
                Map<String, Object> mpItem = new HashMap<>();
                mpItem.put("title", item.getNombreProducto());
                mpItem.put("quantity", item.getCantidad());
                mpItem.put("unit_price", item.getPrecioUnitario().doubleValue());
                mpItem.put("currency_id", "PEN");
                mpItems.add(mpItem);
            }

            // Configurar URLs de retorno
            Map<String, String> backUrls = new HashMap<>();
            backUrls.put("success", frontendUrl + "/pago-exito?pedidoId=" + pedidoId);
            backUrls.put("failure", frontendUrl + "/pago-error?pedidoId=" + pedidoId);
            backUrls.put("pending", frontendUrl + "/pago-pendiente?pedidoId=" + pedidoId);

            // Construir payload completo
            Map<String, Object> payload = new HashMap<>();
            payload.put("items", mpItems);
            payload.put("back_urls", backUrls);
            payload.put("auto_return", "approved"); 
            payload.put("external_reference", pedidoId.toString());
            
            // Metadata adicional
            Map<String, String> metadata = new HashMap<>();
            metadata.put("pedido_id", pedidoId.toString());
            payload.put("metadata", metadata);

            // Configurar headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(mercadoPagoAccessToken);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                MP_API_URL, 
                request, 
                String.class
            );

            JsonNode responseJson = objectMapper.readTree(response.getBody());

            if (response.getStatusCode() == HttpStatus.CREATED) {
                String preferenceId = responseJson.get("id").asText();
                String initPoint = responseJson.get("init_point").asText();
                
                log.info("Preferencia creada exitosamente. ID: {}, URL: {}", 
                    preferenceId, initPoint);
                
                return responseJson;
            } else {
                log.error("Error en Mercado Pago: {}", responseJson);
                throw new RuntimeException("Error al crear preferencia de Mercado Pago");
            }

        } catch (Exception e) {
            log.error("Error al crear preferencia en Mercado Pago", e);
            throw new RuntimeException("Error al procesar el pago: " + e.getMessage());
        }
    }

    /**
     * Consulta el estado de un pago en Mercado Pago.
     */
    public JsonNode consultarPago(String paymentId) {
        try {
            String url = "https://api.mercadopago.com/v1/payments/" + paymentId;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(mercadoPagoAccessToken);
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                request, 
                String.class
            );
            
            return objectMapper.readTree(response.getBody());
            
        } catch (Exception e) {
            log.error("Error al consultar pago en Mercado Pago", e);
            throw new RuntimeException("Error al consultar estado del pago");
        }
    }
}