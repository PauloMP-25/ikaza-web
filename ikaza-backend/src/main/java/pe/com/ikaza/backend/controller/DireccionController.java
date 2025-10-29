package pe.com.ikaza.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.DireccionRequest;
import pe.com.ikaza.backend.dto.response.DireccionResponse;
import pe.com.ikaza.backend.service.DireccionService;
import pe.com.ikaza.backend.service.ClienteService;
import pe.com.ikaza.backend.utils.SecurityUtils;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/usuarios/direcciones")
// Asume que el ID del usuario se obtiene del contexto de seguridad (JWT/Principal)
public class DireccionController {

    @Autowired
    private DireccionService direccionService;

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
        // ** NOTA: Reemplazar el 6 por una llamada a ClienteService.obtenerIdPorEmail(email)
        return clienteService.obtenerIdPorEmail(email);
    }
    
    /**
     * GET /api/usuarios/direcciones
     * Carga todas las direcciones del usuario autenticado.
     */
    @GetMapping
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<List<DireccionResponse>> cargarDirecciones() {
        Integer idUsuario = getCurrentUserId();
        List<DireccionResponse> direcciones = direccionService.cargarDirecciones(idUsuario);
        return ResponseEntity.ok(direcciones);
    }

    /**
     * POST /api/usuarios/direcciones
     * Guarda una nueva dirección.
     */
@PostMapping
@PreAuthorize("hasRole('CLIENTE')")
public ResponseEntity<?> guardarDireccion(@Valid @RequestBody DireccionRequest request) {
    try {
        Integer idUsuario = getCurrentUserId();
        DireccionResponse nuevaDireccion = direccionService.guardarDireccion(idUsuario, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaDireccion); // ✅ AHORA HttpStatus funciona
    } catch (Exception e) {
        // Este catch solo capturará excepciones de servicio, no de validación
        Map<String, Object> errorResponse = new HashMap<>(); // ✅ AHORA HashMap funciona
        errorResponse.put("error", e.getMessage());
        errorResponse.put("timestamp", java.time.LocalDateTime.now());
        return ResponseEntity.badRequest().body(errorResponse);
    }
}

    /**
     * PUT /api/usuarios/direcciones/{idDireccion}
     * Actualiza una dirección existente.
     */
    @PutMapping("/{idDireccion}")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<DireccionResponse> actualizarDireccion(@PathVariable Integer idDireccion, @Valid @RequestBody DireccionRequest request) {
        Integer idUsuario = getCurrentUserId();
        DireccionResponse actualizada = direccionService.actualizarDireccion(idDireccion, idUsuario, request);
        return ResponseEntity.ok(actualizada);
    }

    /**
     * PUT /api/usuarios/direcciones/{idDireccion}/principal
     * Actualiza una dirección existente marcándola como principal (con lógica de negocio).
     */
    @PutMapping("/{idDireccion}/principal")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<DireccionResponse> actualizarDireccionPrincipal(@PathVariable Integer idDireccion, @Valid @RequestBody DireccionRequest request) {
        Integer idUsuario = getCurrentUserId();
        // Llamada a la función con lógica de negocio
        DireccionResponse actualizada = direccionService.actualizarDireccionPrincipal(idDireccion, idUsuario, request);
        return ResponseEntity.ok(actualizada);
    }

    /**
     * DELETE /api/usuarios/direcciones/{idDireccion}
     * Elimina una dirección.
     */
    @DeleteMapping("/{idDireccion}")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<Void> eliminarDireccion(@PathVariable Integer idDireccion) {
        Integer idUsuario = getCurrentUserId();
        direccionService.eliminarDireccion(idDireccion, idUsuario);
        return ResponseEntity.noContent().build();
    }
}
