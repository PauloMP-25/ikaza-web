package pe.com.ikaza.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pe.com.ikaza.backend.dto.request.PedidoRequest;
import pe.com.ikaza.backend.entity.Tarjeta;
import pe.com.ikaza.backend.enums.EstadoPago;
import pe.com.ikaza.backend.enums.MetodoPago;
import pe.com.ikaza.backend.model.internal.ResultadoPago;
import pe.com.ikaza.backend.repository.jpa.TarjetaRepository;

/**
 * Servicio que maneja la estrategia de procesamiento de pagos
 * Separa la lógica de pagos del PedidoService
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ProcesadorPagoService {

    private final CulqiService culqiService;
    private final MercadoPagoService mercadoPagoService;
    private final TarjetaRepository tarjetaRepository;

    /**
     * Procesa el pago según el método seleccionado
     */
    public ResultadoPago procesarPago(PedidoRequest request, Integer idUsuario, Long pedidoId) {
        log.info("Procesando pago con método: {}", request.getMetodoPago());

        // Si usa tarjeta guardada
        if (request.getIdTarjetaGuardada() != null) {
            return procesarPagoConTarjetaGuardada(request);
        }

        // Según método de pago
        switch (request.getMetodoPago()) {
            case "CULQI":
                return procesarPagoCulqi(request);
            
            case "MERCADO_PAGO":
                return procesarPagoMercadoPago(request, pedidoId);
            
            case "TRANSFERENCIA_BANCARIA":
            case "EFECTIVO_CONTRAENTREGA":
                return procesarPagoDiferido(request.getMetodoPago());
            
            default:
                throw new RuntimeException("Método de pago no soportado: " + request.getMetodoPago());
        }
    }

    /**
     * Procesa pago con tarjeta guardada (Culqi)
     */
    private ResultadoPago procesarPagoConTarjetaGuardada(PedidoRequest request) {
        log.info("Procesando pago con tarjeta guardada ID: {}", request.getIdTarjetaGuardada());

        Tarjeta tarjeta = tarjetaRepository.findById(request.getIdTarjetaGuardada())
                .orElseThrow(() -> new RuntimeException("Tarjeta no encontrada"));

        JsonNode respuestaCulqi = culqiService.crearCargo(
                tarjeta.getTokenPago(),
                request.getTotal(),
                request.getEmail());

        String transaccionId = respuestaCulqi.get("id").asText();

        return ResultadoPago.builder()
                .exitoso(true)
                .transaccionId(transaccionId)
                .requiereRedireccion(false)
                .estadoPago(EstadoPago.APROBADO)
                .metodoPago(MetodoPago.CULQI)
                .datosJson(respuestaCulqi.toString())
                .build();
    }

    /**
     * Procesa pago con Culqi (síncrono)
     */
    private ResultadoPago procesarPagoCulqi(PedidoRequest request) {
        log.info("Procesando pago con Culqi (token)");

        if (!culqiService.validarToken(request.getTokenCulqi())) {
            throw new RuntimeException("Token de Culqi inválido");
        }

        JsonNode respuestaCulqi = culqiService.crearCargo(
                request.getTokenCulqi(),
                request.getTotal(),
                request.getEmail());

        String transaccionId = respuestaCulqi.get("id").asText();

        return ResultadoPago.builder()
                .exitoso(true)
                .transaccionId(transaccionId)
                .requiereRedireccion(false)
                .estadoPago(EstadoPago.APROBADO)
                .metodoPago(MetodoPago.CULQI)
                .datosJson(respuestaCulqi.toString())
                .build();
    }

    /**
     * Procesa pago con Mercado Pago (asíncrono)
     * Devuelve URL de redirección, el pedido ya debe estar creado
     */
    private ResultadoPago procesarPagoMercadoPago(PedidoRequest request, Long pedidoId) {
        log.info("Creando preferencia de Mercado Pago para pedido: {}", pedidoId);

        JsonNode respuestaMP = mercadoPagoService.crearPreferencia(
                request.getCartItems(),
                pedidoId);

        String preferenceId = respuestaMP.get("id").asText();
        String redirectUrl = respuestaMP.get("init_point").asText();

        return ResultadoPago.builder()
                .exitoso(true)
                .transaccionId(preferenceId)
                .urlRedireccion(redirectUrl)
                .requiereRedireccion(true)
                .estadoPago(EstadoPago.PENDIENTE)
                .metodoPago(MetodoPago.MERCADO_PAGO)
                .datosJson(respuestaMP.toString())
                .build();
    }

    /**
     * Procesa pagos diferidos (transferencia, efectivo)
     */
    private ResultadoPago procesarPagoDiferido(String metodoPago) {
        log.info("Procesando pago diferido: {}", metodoPago);

        return ResultadoPago.builder()
                .exitoso(true)
                .requiereRedireccion(false)
                .estadoPago(EstadoPago.PENDIENTE)
                .metodoPago(MetodoPago.valueOf(metodoPago))
                .build();
    }
}