package pe.com.ikaza.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.PedidoRequest;
import pe.com.ikaza.backend.dto.response.PedidoDetalleResponse;
import pe.com.ikaza.backend.dto.response.PedidoResponse;
import pe.com.ikaza.backend.entity.Pedido;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.UsuarioRepository;
import pe.com.ikaza.backend.service.PedidoService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controlador refactorizado de Pedidos
 * Separa los flujos síncronos y asíncronos
 */
@RestController
@RequestMapping("/api/usuarios/pedidos")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.frontend.url:http://localhost:4200}")
public class PedidoController {

    private final PedidoService pedidoService;
    private final UsuarioRepository usuarioRepository;

    /**
     * Endpoint para crear pedidos SÍNCRONOS
     * Soporta: Transferencia Bancaria, Efectivo Contraentrega
     * NOTA: MercadoPago se maneja en WebhookController con
     * /api/webhooks/mercadopago/create-preference
     */
    @PostMapping("/crear")
    public ResponseEntity<PedidoResponse> crearPedido(
            @Valid @RequestBody PedidoRequest request,
            Authentication authentication) {

        try {
            Usuario usuario = extraerUsuario(authentication);
            Integer idUsuario = usuario.getIdUsuario();

            log.info("Procesando checkout para usuario: {} con {} items",
                    idUsuario, request.getCartItems().size());

            // Validar que el usuario del request coincida (seguridad adicional)
            if (request.getIdUsuario() != null && !request.getIdUsuario().equals(idUsuario)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(PedidoResponse.error("Usuario no autorizado"));
            }

            log.info("Nuevo pedido - Usuario: {}, Método: {}", idUsuario, request.getMetodoPago());

            // Validar que no sea MercadoPago (ese flujo va por WebhookController)
            if ("MERCADO_PAGO".equals(request.getMetodoPago())) {
                return ResponseEntity.badRequest()
                        .body(PedidoResponse.error(
                                "MercadoPago debe procesarse desde /api/webhooks/mercadopago/create-preference"));
            }

            return ResponseEntity.ok(null);

        } catch (Exception e) {
            log.error("Error al crear pedido", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PedidoResponse.error("Error al procesar el pedido: " + e.getMessage()));
        }
    }

    /**
     * Endpoint para confirmar pago asíncrono (Mercado Pago).
     * POST /api/pedidos/confirmar-pago
     * Llamado desde el frontend después de la redirección de Mercado Pago.
     */
    @GetMapping("/confirmar-mercadopago")
    public ResponseEntity<PedidoResponse> confirmarPagoMercadoPago(
            @RequestParam Long pedidoId,
            @RequestParam(required = false) String payment_id,
            @RequestParam(required = false) String status,
            Authentication authentication) {

        try {
            Usuario usuario = extraerUsuario(authentication);
            Integer idUsuario = usuario.getIdUsuario();

            log.info("Confirmando MercadoPago - Pedido: {}, Payment: {}", pedidoId, payment_id);

            PedidoResponse response = pedidoService.confirmarPagoMercadoPago(
                    pedidoId, payment_id, status, idUsuario);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error al confirmar pago MercadoPago", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PedidoResponse.error("Error al confirmar el pago: " + e.getMessage()));
        }
    }

    // ========== ENDPOINTS PARA CLIENTES ==========

    /**
     * Obtener un pedido por ID (Detalle Completo).
     * GET /api/pedidos/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPedido(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            Usuario usuario = extraerUsuario(authentication);
            Integer idUsuario = usuario.getIdUsuario();
            PedidoDetalleResponse response = pedidoService.getPedidoDetalleByIdAndUser(id, idUsuario);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error al obtener pedido: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(PedidoResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Error al obtener pedido", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PedidoResponse.error("Error interno: " + e.getMessage()));
        }
    }

    /**
     * Obtener todos los pedidos del usuario autenticado.
     * GET /api/pedidos/mis-pedidos
     */
    @GetMapping("/mis-pedidos")
    public ResponseEntity<?> obtenerMisPedidos(Authentication authentication) {
        try {
            Usuario usuario = extraerUsuario(authentication);
            Integer idUsuario = usuario.getIdUsuario();

            List<Pedido> pedidos = pedidoService.getPedidosByUserId(idUsuario);
            List<PedidoResponse> responseList = pedidos.stream().map(pedido -> {
                int cantidadProductos = pedidoService.contarDetallesPedido(pedido.getIdPedido());
                return PedidoResponse.builder()
                        .success(true)
                        .pedidoId(pedido.getIdPedido())

                        .numeroPedido(pedido.getNumeroPedido())
                        .estadoPedido(pedido.getEstado().name())
                        .estadoPago(pedido.getEstadoPago().name())
                        .total(pedido.getTotal())
                        .subtotal(pedido.getSubtotal())

                        .fechaPedido(pedido.getFechaPedido())
                        .mensaje("Pedidos obtenidos")
                        .cantidadProductos(cantidadProductos)
                        .build();
            }).collect(Collectors.toList());
            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("Error al obtener pedidos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(PedidoResponse.error("Error al obtener los pedidos: " + e.getMessage()));
        }
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Extrae el ID del usuario del JWT utilizando el email.
     */
    private Usuario extraerUsuario(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Usuario no autenticado");
        }
        String email = authentication.getName();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
}
