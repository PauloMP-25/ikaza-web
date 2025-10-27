package pe.com.ikaza.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.TarjetaRequest;
import pe.com.ikaza.backend.dto.response.TarjetaResponse;
import pe.com.ikaza.backend.service.TarjetaService;
import pe.com.ikaza.backend.service.ClienteService;
import pe.com.ikaza.backend.utils.SecurityUtils;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios/pagos")
public class TarjetaController {

    @Autowired
    private TarjetaService metodoPagoService;

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private SecurityUtils securityUtils;
    
    /**
     * Obtiene el ID del usuario autenticado a partir del token JWT.
     * ESTA ES LA FUNCIÓN CORREGIDA
     */
    private Integer getCurrentUserId() {
        // 1. Obtener el email (username) del contexto de seguridad
        String email = securityUtils.getCurrentUserEmail();
        
        if (email == null) {
            // Esto no debería ocurrir en una ruta @PreAuthorize, pero es buena práctica
            throw new RuntimeException("Usuario no autenticado o token no contiene email.");
        }
        
        // 2. Usar el email para buscar el id_usuario en la BD
        // ** NOTA: Reemplazar el 6 por una llamada a usuarioService.obtenerIdPorEmail(email)
        return clienteService.obtenerIdPorEmail(email);
    }

    /**
     * GET /api/usuarios/pagos
     * Carga todos los métodos de pago (tarjetas) activos del usuario autenticado.
     */
    @GetMapping
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<List<TarjetaResponse>> cargarTarjetas() {
        Integer idUsuario = getCurrentUserId();
        List<TarjetaResponse> tarjetas = metodoPagoService.cargarTarjetas(idUsuario);
        return ResponseEntity.ok(tarjetas);
    }

    /**
     * POST /api/usuarios/pagos
     * Guarda una nueva tarjeta.
     */
    @PostMapping
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<TarjetaResponse> guardarTarjeta(@Valid @RequestBody TarjetaRequest request) {
        Integer idUsuario = getCurrentUserId();
        // NOTA: Aquí iría la lógica de integración final con la pasarela de pago 
        // para obtener el 'token_pago' si no viene en el request.
        
        TarjetaResponse nuevaTarjeta = metodoPagoService.guardarTarjeta(idUsuario, request);
        return ResponseEntity.ok(nuevaTarjeta);
    }

    /**
     * DELETE /api/usuarios/pagos/{idMetodo}
     * Elimina (desactiva) un método de pago.
     */
    @DeleteMapping("/{idMetodo}")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<Void> eliminarTarjeta(@PathVariable Integer idMetodo) {
        Integer idUsuario = getCurrentUserId();
        metodoPagoService.eliminarTarjeta(idMetodo, idUsuario);
        return ResponseEntity.noContent().build();
    }
    
    /**
    * PUT /api/usuarios/pagos/{idMetodo}/principal
    * Actualiza una tarjeta existente marcándola como principal (con lógica de negocio).
    */
    @PutMapping("/{idMetodo}/principal")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<TarjetaResponse> actualizarDireccionPrincipal(@PathVariable Integer idMetodo, @Valid @RequestBody TarjetaRequest request) {
        Integer idUsuario = getCurrentUserId();
        // Llamada a la función con lógica de negocio
        TarjetaResponse actualizada = metodoPagoService.actualizarTarjetaPrincipal(idMetodo, idUsuario, request);
        return ResponseEntity.ok(actualizada);
    }
}