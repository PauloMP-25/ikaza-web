package pe.com.ikaza.backend.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.LoginRequest;
import pe.com.ikaza.backend.dto.request.RegistroRequest;
import pe.com.ikaza.backend.dto.response.AuthResponse;
import pe.com.ikaza.backend.dto.response.MessageResponse;
import pe.com.ikaza.backend.service.AuthService;

/**
 * Controlador REST para autenticación (Login, Registro, Token)
 * Maneja toda la lógica de autenticación con Firebase
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * POST /api/auth/registro
     * Registrar nuevo usuario en Firebase y sincronizar con PostgreSQL
     * 
     * PÚBLICO - No requiere autenticación
     */
    @PostMapping("/registro")
    public ResponseEntity<?> registrarUsuario(@Valid @RequestBody RegistroRequest request) {
        try {
            logger.info("📝 Intentando registrar usuario: {}", request.getEmail());
            
            AuthResponse response = authService.registrarUsuario(request);
            
            logger.info("✅ Usuario registrado exitosamente: {}", request.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Error de validación en registro: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse(e.getMessage(), false));
                    
        } catch (Exception e) {
            logger.error("❌ Error inesperado en registro: {}", e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al registrar usuario: " + e.getMessage(), false));
        }
    }

    /**
     * POST /api/auth/login
     * Iniciar sesión con Firebase y obtener datos del usuario
     * 
     * PÚBLICO - No requiere autenticación
     */
    @PostMapping("/login")
    public ResponseEntity<?> iniciarSesion(@Valid @RequestBody LoginRequest request) {
        try {
            logger.info("🔐 Intento de login para: {}", request.getEmail());
            
            AuthResponse response = authService.iniciarSesion(request);
            
            logger.info("✅ Login exitoso para: {}", request.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Credenciales inválidas para: {}", request.getEmail());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse(e.getMessage(), false));
                    
        } catch (Exception e) {
            logger.error("❌ Error en login: {}", e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al iniciar sesión: " + e.getMessage(), false));
        }
    }

    /**
     * POST /api/auth/verificar-token
     * Verificar si un token de Firebase es válido
     * 
     * PÚBLICO - Útil para validar tokens en el frontend
     */
    @PostMapping("/verificar-token")
    public ResponseEntity<?> verificarToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(new MessageResponse("Token no proporcionado", false));
            }

            String token = authHeader.substring(7);
            logger.info("🔍 Verificando token...");
            
            AuthResponse response = authService.verificarToken(token);
            
            logger.info("✅ Token válido para: {}", response.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.warn("❌ Token inválido: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Token inválido o expirado", false));
        }
    }

    /**
     * POST /api/auth/refresh
     * Refrescar token de Firebase
     * 
     * PÚBLICO - Permite renovar tokens expirados
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refrescarToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body(new MessageResponse("Token no proporcionado", false));
            }

            String refreshToken = authHeader.substring(7);
            logger.info("🔄 Refrescando token...");
            
            AuthResponse response = authService.refrescarToken(refreshToken);
            
            logger.info("✅ Token refrescado exitosamente");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Error al refrescar token: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Error al refrescar token", false));
        }
    }

    /**
     * POST /api/auth/logout
     * Cerrar sesión (opcional - Firebase maneja esto en el cliente)
     * 
     * REQUIERE AUTENTICACIÓN
     */
    @PostMapping("/logout")
    public ResponseEntity<?> cerrarSesion(@RequestParam String firebaseUid) {
        try {
            logger.info("👋 Cerrando sesión para UID: {}", firebaseUid);
            
            authService.actualizarUltimoAcceso(firebaseUid);
            
            return ResponseEntity.ok(new MessageResponse("Sesión cerrada exitosamente", true));
            
        } catch (Exception e) {
            logger.error("❌ Error al cerrar sesión: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al cerrar sesión", false));
        }
    }

    /**
     * GET /api/auth/verificar-email/{email}
     * Verificar si un email ya está registrado
     * 
     * PÚBLICO - Útil para validación en tiempo real en formularios
     */
    @GetMapping("/verificar-email/{email}")
    public ResponseEntity<?> verificarEmailDisponible(@PathVariable String email) {
        try {
            boolean disponible = authService.verificarEmailDisponible(email);
            
            return ResponseEntity.ok(new MessageResponse(
                disponible ? "Email disponible" : "Email ya registrado",
                disponible
            ));
            
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al verificar email", false));
        }
    }
}

/**
 * FLUJO DE AUTENTICACIÓN:
 * 
 * 1. REGISTRO:
 *    Frontend → POST /api/auth/registro
 *    - Se crea usuario en Firebase
 *    - Se sincroniza con PostgreSQL
 *    - Se retorna token y datos del usuario
 * 
 * 2. LOGIN:
 *    Frontend → POST /api/auth/login
 *    - Firebase valida credenciales
 *    - Se obtienen datos del usuario desde PostgreSQL
 *    - Se retorna token y datos completos
 * 
 * 3. VERIFICAR TOKEN:
 *    Frontend → POST /api/auth/verificar-token (con header Authorization)
 *    - Valida token de Firebase
 *    - Retorna datos actualizados del usuario
 * 
 * 4. LOGOUT:
 *    Frontend → POST /api/auth/logout
 *    - Actualiza último acceso en BD
 *    - Firebase maneja revocación del token en cliente
 */