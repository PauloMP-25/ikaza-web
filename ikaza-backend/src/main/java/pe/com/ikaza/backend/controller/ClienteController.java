package pe.com.ikaza.backend.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.ActualizarUsuarioRequest;
import pe.com.ikaza.backend.dto.response.MessageResponse;
import pe.com.ikaza.backend.dto.response.UsuarioResponse;
import pe.com.ikaza.backend.service.ClienteService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para la gestión del Perfil Cliente y Administración de
 * Clientes.
 * Rutas base: /api/clientes
 */
@RestController
@RequestMapping("/api/clientes")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ClienteController {

    private static final Logger logger = LoggerFactory.getLogger(ClienteController.class);

    @Autowired
    private ClienteService clienteService;

    // ===============================================
    // ENDPOINTS DE PERFIL (Usuario autenticado)
    // ===============================================

    /**
     * POST /api/clientes/crear-perfil
     * Crea el registro inicial Cliente después del registro/login minimalista.
     * REQUIERE AUTENTICACIÓN (token JWT válido en el header)
     * FIX: Reemplaza {firebaseUid} por {email}
     */
    @PostMapping("/crear-perfil/{email}")
    public ResponseEntity<?> crearPerfilInicial(@PathVariable String email) {
        try {
            logger.info("📝 Recibiendo petición para crear perfil inicial Cliente para email: {}", email);
            UsuarioResponse response = clienteService.crearPerfilInicial(email);
            logger.info("✅ Perfil Cliente inicial creado/obtenido exitosamente.");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            logger.error("❌ Error al crear perfil inicial: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * GET /api/clientes/perfil/{email}
     * Obtener perfil del usuario autenticado.
     * REQUIERE AUTENTICACIÓN
     * FIX: Reemplaza {firebaseUid} por {email} y llama a obtenerPorEmail
     */
    @GetMapping("/perfil/{email}")
    public ResponseEntity<?> obtenerPerfil(@PathVariable String email) {
        try {
            logger.info("👤 Obteniendo perfil para email: {}", email);
            UsuarioResponse cliente = clienteService.obtenerPorEmail(email); // FIX: Llama al método actualizado
            return ResponseEntity.ok(cliente);
        } catch (RuntimeException e) {
            logger.warn("⚠️ Cliente no encontrado: {}", email);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/clientes/perfil/{email}
     * Actualizar perfil del usuario autenticado.
     * REQUIERE AUTENTICACIÓN
     * FIX: Reemplaza {firebaseUid} por {email}
     */
    @PutMapping("/perfil/{email}")
    public ResponseEntity<?> actualizarPerfil(
            @PathVariable String email, // FIX: Cambio de firebaseUid a email
            @Valid @RequestBody ActualizarUsuarioRequest request) {
        try {
            logger.info("✏️ Actualizando perfil para email: {}", email);
            UsuarioResponse cliente = clienteService.actualizarCliente(email, request); // FIX: Llama al método actualizado
            logger.info("✅ Perfil actualizado exitosamente");
            return ResponseEntity.ok(cliente);
        } catch (RuntimeException e) {
            logger.error("❌ Error al actualizar perfil: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/clientes/perfil/{email}/verificar-telefono
     * Marcar teléfono como verificado
     *
     * AUTENTICADO - Después de verificar código SMS
     * FIX: Reemplaza {firebaseUid} por {email}
     */
    @PutMapping("/perfil/{email}/verificar-telefono")
    public ResponseEntity<?> verificarTelefono(@PathVariable String email) { // FIX: Cambio de firebaseUid a email
        try {
            logger.info("📱 Verificando teléfono para email: {}", email);

            UsuarioResponse usuario = clienteService.verificarTelefono(email); // FIX: Llama al método actualizado
            return ResponseEntity.ok(usuario);

        } catch (RuntimeException e) {
            logger.error("❌ Error al verificar teléfono: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    // ===============================================
    // ENDPOINTS ADMINISTRATIVOS (Solo ADMINISTRADOR)
    // ===============================================

    /**
     * GET /api/clientes
     * Listar todos los clientes con paginación (Datos esenciales).
     * ADMIN - Listar clientes
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> listarClientes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        try {
            logger.info("📋 Listando clientes - Página: {}, Tamaño: {}", page, size);
            Sort sort = sortDir.equalsIgnoreCase("ASC")
                    ? Sort.by(sortBy).ascending()
                    : Sort.by(sortBy).descending();
            Pageable pageable = PageRequest.of(page, size, sort);

            // Usamos el nuevo método del servicio
            Page<UsuarioResponse> clientes = clienteService.listarClientesPaginados(pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("clientes", clientes.getContent());
            response.put("currentPage", clientes.getNumber());
            response.put("totalItems", clientes.getTotalElements());
            response.put("totalPages", clientes.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("❌ Error al listar clientes: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al listar clientes", false));
        }
    }

    /**
     * GET /api/clientes/buscar
     * Buscar clientes por email, documento o teléfono.
     * ADMIN - Buscar con filtros
     */
    @GetMapping("/buscar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> buscarClientes(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String documento,
            @RequestParam(required = false) String telefono) {
        try {
            logger.info("🔎 Buscando clientes con filtros...");
            List<UsuarioResponse> clientes = clienteService.buscarClientes(email, documento, telefono);
            return ResponseEntity.ok(clientes);

        } catch (Exception e) {
            logger.error("❌ Error al buscar clientes: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al buscar clientes", false));
        }
    }

    /**
     * PUT /api/clientes/{id}/activar
     * Activar usuario (Solo campo 'activo').
     * ADMIN - Reactivar usuario desactivado
     */
    @PutMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> activarUsuario(@PathVariable Integer id) {
        try {
            logger.info("✅ Activando usuario ID: {}", id);
            clienteService.activarUsuario(id);
            return ResponseEntity.ok(new MessageResponse("Usuario activado exitosamente", true));

        } catch (RuntimeException e) {
            logger.error("❌ Error al activar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/clientes/{id}/desactivar
     * Desactivar usuario (Solo campo 'activo').
     * ADMIN - Suspender usuario
     */
    @PutMapping("/{id}/desactivar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> desactivarUsuario(@PathVariable Integer id) {
        try {
            logger.info("🚫 Desactivando usuario ID: {}", id);
            clienteService.desactivarUsuario(id);
            return ResponseEntity.ok(new MessageResponse("Usuario desactivado exitosamente", true));

        } catch (RuntimeException e) {
            logger.error("❌ Error al desactivar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * GET /api/clientes/estadisticas
     * Obtener estadísticas de clientes/usuarios.
     * ADMIN - Dashboard administrativo
     */
    @GetMapping("/estadisticas")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> obtenerEstadisticas() {
        try {
            logger.info("📊 Obteniendo estadísticas de clientes");
            Map<String, Object> stats = clienteService.obtenerEstadisticas();
            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            logger.error("❌ Error al obtener estadísticas: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al obtener estadísticas", false));
        }
    }
}
