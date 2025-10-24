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
import pe.com.ikaza.backend.service.UsuarioService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión de usuarios (CRUD y administración)
 * 
 * SEPARACIÓN DE RESPONSABILIDADES:
 * - AuthController: Registro, Login, Tokens
 * - UsuarioController: Gestión de usuarios, Perfil, Administración
 */
@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UsuarioController {

    private static final Logger logger = LoggerFactory.getLogger(UsuarioController.class);

    @Autowired
    private UsuarioService usuarioService;

    // ===============================================
    // ENDPOINTS DE PERFIL (Usuario autenticado)
    // ===============================================

    /**
     * GET /api/usuarios/perfil/{firebaseUid}
     * Obtener perfil del usuario autenticado
     * 
     * AUTENTICADO - Ver perfil propio
     */
    @GetMapping("/perfil/{firebaseUid}")
    public ResponseEntity<?> obtenerPerfil(@PathVariable String firebaseUid) {
        try {
            logger.info("👤 Obteniendo perfil para UID: {}", firebaseUid);

            UsuarioResponse usuario = usuarioService.obtenerPorFirebaseUid(firebaseUid);
            return ResponseEntity.ok(usuario);

        } catch (RuntimeException e) {
            logger.warn("⚠️ Usuario no encontrado: {}", firebaseUid);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/usuarios/perfil/{firebaseUid}
     * Actualizar perfil del usuario autenticado
     * 
     * AUTENTICADO - Editar perfil propio
     */
    @PutMapping("/perfil/{firebaseUid}")
    public ResponseEntity<?> actualizarPerfil(
            @PathVariable String firebaseUid,
            @Valid @RequestBody ActualizarUsuarioRequest request) {
        try {
            logger.info("✏️ Actualizando perfil para UID: {}", firebaseUid);

            UsuarioResponse usuario = usuarioService.actualizarUsuario(firebaseUid, request);

            logger.info("✅ Perfil actualizado exitosamente");
            return ResponseEntity.ok(usuario);

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

            UsuarioResponse usuario = usuarioService.verificarTelefono(firebaseUid);
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
     * GET /api/usuarios
     * Listar todos los usuarios con paginación
     * 
     * ADMIN - Listar usuarios
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> listarUsuarios(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fechaCreacion") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        try {
            logger.info("📋 Listando usuarios - Página: {}, Tamaño: {}", page, size);

            Sort sort = sortDir.equalsIgnoreCase("ASC")
                    ? Sort.by(sortBy).ascending()
                    : Sort.by(sortBy).descending();

            Pageable pageable = PageRequest.of(page, size, sort);
            Page<UsuarioResponse> usuarios = usuarioService.listarUsuariosPaginados(pageable);

            // Crear respuesta con metadatos de paginación
            Map<String, Object> response = new HashMap<>();
            response.put("usuarios", usuarios.getContent());
            response.put("currentPage", usuarios.getNumber());
            response.put("totalItems", usuarios.getTotalElements());
            response.put("totalPages", usuarios.getTotalPages());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Error al listar usuarios: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al listar usuarios", false));
        }
    }

    /**
     * GET /api/usuarios/{id}
     * Obtener usuario por ID
     * 
     * ADMIN - Ver usuario específico
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> obtenerUsuarioPorId(@PathVariable Integer id) {
        try {
            logger.info("🔍 Obteniendo usuario ID: {}", id);

            UsuarioResponse usuario = usuarioService.obtenerPorId(id);
            return ResponseEntity.ok(usuario);

        } catch (RuntimeException e) {
            logger.warn("⚠️ Usuario no encontrado ID: {}", id);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * GET /api/usuarios/buscar
     * Buscar usuarios por diferentes criterios
     * 
     * ADMIN - Buscar con filtros
     */
    @GetMapping("/buscar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> buscarUsuarios(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String documento,
            @RequestParam(required = false) Boolean activo) {
        try {
            logger.info("🔎 Buscando usuarios con filtros...");

            List<UsuarioResponse> usuarios = usuarioService.buscarUsuarios(email, nombre, documento, activo);
            return ResponseEntity.ok(usuarios);

        } catch (Exception e) {
            logger.error("❌ Error al buscar usuarios: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al buscar usuarios", false));
        }
    }

    /**
     * GET /api/usuarios/incompletos
     * Obtener usuarios con datos incompletos
     * 
     * ADMIN - Usuarios que no han completado su perfil
     */
    @GetMapping("/incompletos")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<List<UsuarioResponse>> obtenerUsuariosIncompletos() {
        logger.info("📝 Obteniendo usuarios con datos incompletos");

        List<UsuarioResponse> usuarios = usuarioService.obtenerUsuariosConDatosIncompletos();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * GET /api/usuarios/estadisticas
     * Obtener estadísticas de usuarios
     * 
     * ADMIN - Dashboard administrativo
     */
    @GetMapping("/estadisticas")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> obtenerEstadisticas() {
        try {
            logger.info("📊 Obteniendo estadísticas de usuarios");

            Map<String, Object> stats = usuarioService.obtenerEstadisticas();
            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            logger.error("❌ Error al obtener estadísticas: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al obtener estadísticas", false));
        }
    }

    /**
     * PUT /api/usuarios/{id}
     * Actualizar usuario (admin)
     * 
     * ADMIN - Editar cualquier usuario
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> actualizarUsuario(
            @PathVariable Integer id,
            @Valid @RequestBody ActualizarUsuarioRequest request) {
        try {
            logger.info("✏️ Admin actualizando usuario ID: {}", id);

            UsuarioResponse usuario = usuarioService.actualizarUsuarioPorId(id, request);

            logger.info("✅ Usuario actualizado por admin");
            return ResponseEntity.ok(usuario);

        } catch (RuntimeException e) {
            logger.error("❌ Error al actualizar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/usuarios/{id}/activar
     * Activar usuario
     * 
     * ADMIN - Reactivar usuario desactivado
     */
    @PutMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> activarUsuario(@PathVariable Integer id) {
        try {
            logger.info("✅ Activando usuario ID: {}", id);

            usuarioService.activarUsuario(id);
            return ResponseEntity.ok(new MessageResponse("Usuario activado exitosamente", true));

        } catch (RuntimeException e) {
            logger.error("❌ Error al activar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/usuarios/{id}/desactivar
     * Desactivar usuario
     * 
     * ADMIN - Suspender usuario
     */
    @PutMapping("/{id}/desactivar")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> desactivarUsuario(@PathVariable Integer id) {
        try {
            logger.info("🚫 Desactivando usuario ID: {}", id);

            usuarioService.desactivarUsuario(id);
            return ResponseEntity.ok(new MessageResponse("Usuario desactivado exitosamente", true));

        } catch (RuntimeException e) {
            logger.error("❌ Error al desactivar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * PUT /api/usuarios/{id}/cambiar-rol
     * Cambiar rol de usuario
     * 
     * ADMIN - Promover/degradar usuario
     */
    @PutMapping("/{id}/cambiar-rol")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> cambiarRol(
            @PathVariable Integer id,
            @RequestParam String nuevoRol) {
        try {
            logger.info("🔄 Cambiando rol de usuario ID: {} a {}", id, nuevoRol);

            UsuarioResponse usuario = usuarioService.cambiarRol(id, nuevoRol);

            logger.info("✅ Rol actualizado exitosamente");
            return ResponseEntity.ok(usuario);

        } catch (RuntimeException e) {
            logger.error("❌ Error al cambiar rol: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * DELETE /api/usuarios/{id}
     * Eliminar usuario (desactivación lógica)
     * 
     * ADMIN - Eliminar usuario del sistema
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Integer id) {
        try {
            logger.info("🗑️ Eliminando (desactivando) usuario ID: {}", id);

            usuarioService.eliminarUsuario(id);
            return ResponseEntity.ok(new MessageResponse("Usuario eliminado exitosamente", true));

        } catch (RuntimeException e) {
            logger.error("❌ Error al eliminar usuario: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
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