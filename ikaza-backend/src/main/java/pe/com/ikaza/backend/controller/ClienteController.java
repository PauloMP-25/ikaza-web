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
     * REQUIERE AUTENTICACIÓN (token de Firebase válido en el header)
     */
    @PostMapping("/crear-perfil/{firebaseUid}")
    public ResponseEntity<?> crearPerfilInicial(@PathVariable String firebaseUid) {
        try {
            logger.info("📝 Recibiendo petición para crear perfil inicial Cliente para UID: {}", firebaseUid);
            UsuarioResponse response = clienteService.crearPerfilInicial(firebaseUid);
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
     * GET /api/clientes/perfil/{firebaseUid}
     * Obtener perfil del usuario autenticado.
     * REQUIERE AUTENTICACIÓN
     */
    @GetMapping("/perfil/{firebaseUid}")
    public ResponseEntity<?> obtenerPerfil(@PathVariable String firebaseUid) {
        try {
            logger.info("👤 Obteniendo perfil para UID: {}", firebaseUid);
            UsuarioResponse cliente = clienteService.obtenerPorFirebaseUid(firebaseUid);
            return ResponseEntity.ok(cliente);
        } catch (RuntimeException e) {
            logger.warn("⚠️ Cliente no encontrado: {}", firebaseUid);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/clientes/perfil/{firebaseUid}
     * Actualizar perfil del usuario autenticado.
     * REQUIERE AUTENTICACIÓN
     */
    @PutMapping("/perfil/{firebaseUid}")
    public ResponseEntity<?> actualizarPerfil(
            @PathVariable String firebaseUid,
            @Valid @RequestBody ActualizarUsuarioRequest request) {
        try {
            logger.info("✏️ Actualizando perfil para UID: {}", firebaseUid);
            UsuarioResponse cliente = clienteService.actualizarCliente(firebaseUid, request);
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
     * PUT /api/usuarios/perfil/{firebaseUid}/verificar-telefono
     * Marcar teléfono como verificado
     * 
     * AUTENTICADO - Después de verificar código SMS
     */
    @PutMapping("/perfil/{firebaseUid}/verificar-telefono")
    public ResponseEntity<?> verificarTelefono(@PathVariable String firebaseUid) {
        try {
            logger.info("📱 Verificando teléfono para UID: {}", firebaseUid);

            UsuarioResponse usuario = clienteService.verificarTelefono(firebaseUid);
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

/**
 * ============================================================
 * SEPARACIÓN DE RESPONSABILIDADES - ENDPOINTS POR CONTROLADOR
 * ============================================================
 * 
 * 🔐 AuthController (/api/auth):
 * --------------------------------
 * POST /api/auth/registro → Registrar nuevo usuario
 * POST /api/auth/login → Iniciar sesión
 * POST /api/auth/verificar-token → Validar token
 * POST /api/auth/refresh → Refrescar token
 * POST /api/auth/logout → Cerrar sesión
 * GET /api/auth/verificar-email/{email} → Verificar disponibilidad
 * 
 * 👤 UsuarioController (/api/usuarios):
 * --------------------------------
 * PERFIL (Usuario autenticado):
 * GET /api/usuarios/perfil/{uid} → Ver perfil propio
 * PUT /api/usuarios/perfil/{uid} → Editar perfil propio
 * PUT /api/usuarios/perfil/{uid}/verificar-telefono → Verificar teléfono
 * 
 * ADMINISTRACIÓN (Solo ADMINISTRADOR):
 * GET /api/usuarios → Listar usuarios (paginado)
 * GET /api/usuarios/{id} → Ver usuario por ID
 * GET /api/usuarios/buscar → Buscar con filtros
 * GET /api/usuarios/incompletos → Usuarios con datos incompletos
 * GET /api/usuarios/estadisticas → Estadísticas de usuarios
 * PUT /api/usuarios/{id} → Actualizar usuario
 * PUT /api/usuarios/{id}/activar → Activar usuario
 * PUT /api/usuarios/{id}/desactivar → Desactivar usuario
 * PUT /api/usuarios/{id}/cambiar-rol → Cambiar rol
 * DELETE /api/usuarios/{id} → Eliminar usuario (lógico)
 * 
 * ============================================================
 * FLUJO DE USO DESDE ANGULAR
 * ============================================================
 * 
 * 1. REGISTRO:
 * Frontend → POST /api/auth/registro
 * AuthService → Crear usuario en Firebase
 * AuthService → Sincronizar con PostgreSQL
 * Respuesta → Token + datos completos del usuario
 * 
 * 2. LOGIN:
 * Frontend → Firebase Authentication (cliente)
 * Frontend → Obtener idToken
 * Frontend → POST /api/auth/verificar-token
 * Respuesta → Datos completos del usuario desde PostgreSQL
 * 
 * 3. VER/EDITAR PERFIL:
 * Usuario → GET /api/usuarios/perfil/{uid}
 * Usuario → PUT /api/usuarios/perfil/{uid}
 * 
 * 4. ADMINISTRACIÓN:
 * Admin → GET /api/usuarios?page=0&size=10
 * Admin → GET /api/usuarios/buscar?email=test
 * Admin → PUT /api/usuarios/1/cambiar-rol?nuevoRol=ADMINISTRADOR
 * 
 * ============================================================
 * NOTAS IMPORTANTES
 * ============================================================
 * 
 * ✅ ENDPOINTS ELIMINADOS (ahora en AuthController):
 * - POST /api/usuarios/sincronizar
 * - GET /api/usuarios/firebase/{uid}
 * - GET /api/usuarios/verificar/{uid}
 * - PUT /api/usuarios/firebase/{uid}/datos-extendidos
 * - PUT /api/usuarios/firebase/{uid}/ultimo-acceso
 * 
 * ✅ NUEVOS ENDPOINTS:
 * - GET /api/usuarios/perfil/{uid}
 * - PUT /api/usuarios/perfil/{uid}
 * - GET /api/usuarios (con paginación)
 * - GET /api/usuarios/buscar (con filtros)
 * - GET /api/usuarios/estadisticas
 * - PUT /api/usuarios/{id}/cambiar-rol
 * 
 * ✅ SEGURIDAD:
 * - Perfil: Requiere autenticación (cualquier usuario)
 * - Administración: Requiere rol ADMINISTRADOR
 * - Tokens validados por FirebaseAuthTokenFilter
 */