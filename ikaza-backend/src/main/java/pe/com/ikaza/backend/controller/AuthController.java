package pe.com.ikaza.backend.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.LoginTokenRequest;
import pe.com.ikaza.backend.dto.request.RegistroRequest;
import pe.com.ikaza.backend.dto.response.AuthResponse;
import pe.com.ikaza.backend.dto.response.MessageResponse;
import pe.com.ikaza.backend.service.AuthService;

/**
 * Controlador REST para autenticación (Registro, Login con Token, Verificación)
 * Maneja toda la lógica de autenticación y sincronización con Firebase.
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
     * Registrar nuevo usuario con email/password en Firebase y sincronizar con PostgreSQL.
     * * PÚBLICO - No requiere autenticación
     */
    @PostMapping("/registro")
    public ResponseEntity<?> registrarUsuario(@Valid @RequestBody RegistroRequest request) {
        try {
            logger.info("Intentando registrar usuario: {}", request.getEmail());

            AuthResponse response = authService.registrarUsuario(request);

            logger.info("Usuario registrado exitosamente: {}", request.getEmail());
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
     * POST /api/auth/login-token
     * Iniciar sesión/sincronizar con ID Token de Firebase. 
     * Usado para: Login con Google/Sociales, Login tradicional después de autenticación exitosa en el cliente.
     * * PÚBLICO - No requiere autenticación, usa el token para autenticar.
     */
    @PostMapping("/login-token")
    public ResponseEntity<?> iniciarSesionConToken(@Valid @RequestBody LoginTokenRequest request) {
        try {
            logger.info("🔐 Intento de login con token (Social/Estandar)");
            // La lógica en el servicio se encargará de verificar el token y de SINCRONIZAR el usuario si no existe (registro con Google)
            AuthResponse response = authService.iniciarSesionConToken(request.getIdToken());

            logger.info("✅ Login/Sincronización exitosa para UID: {}", response.getFirebaseUid());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Token inválido o problema de sincronización: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse(e.getMessage(), false));
        } catch (Exception e) {
            logger.error("❌ Error inesperado en login con token: {}", e.getMessage(), e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al iniciar sesión: " + e.getMessage(), false));
        }
    }

    /**
    * POST /api/auth/verificar-token
    * Verificar si un token de Firebase es válido.
    * * PÚBLICO - Útil para validar tokens en el frontend (para sesiones activas).
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
    * Refrescar token de Firebase (genera nuevo custom token).
    * * PÚBLICO - Permite renovar tokens expirados.
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
    * Cerrar sesión (opcional - maneja el lado del backend).
    * * REQUIERE AUTENTICACIÓN
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
    * Verificar si un email ya está registrado en la BD.
    * PÚBLICO - Útil para validación en tiempo real en formularios.
    */
    @GetMapping("/verificar-email/{email}")
    public ResponseEntity<?> verificarEmailDisponible(@PathVariable String email) {
        try {
            boolean disponible = authService.verificarEmailDisponible(email);

            return ResponseEntity.ok(new MessageResponse(
                    disponible ? "Email disponible" : "Email ya registrado",
                    disponible));

        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error al verificar email", false));
        }
    }
}

/**
 * ============================================================
 * FLUJO DE AUTENTICACIÓN CENTRALIZADO EN FIREBASE ID TOKEN
 * ============================================================
 * * 1. REGISTRO (Email/Password):
 * Frontend → POST /api/auth/registro
 * - Crea usuario en Firebase (email/password).
 * - Sincroniza el nuevo usuario en PostgreSQL.
 * - Retorna token personalizado y datos.
 * * 2. LOGIN (Email/Password o Social - Google/Facebook):
 * Frontend → Autentica en Firebase (obtiene ID Token).
 * Frontend → POST /api/auth/login-token
 * - Backend verifica el ID Token.
 * - Si es un nuevo usuario social, lo SINCRONIZA en PostgreSQL.
 * - Retorna los datos completos del usuario desde PostgreSQL.
 * * 3. VERIFICACIÓN DE SESIÓN:
 * Frontend → POST /api/auth/verificar-token (con header Authorization)
 * - Valida token de Firebase.
 * - Retorna datos actualizados del usuario.
 * * 4. LOGOUT:
 * Frontend → POST /api/auth/logout
 * - Actualiza el último acceso en BD.
 * - El cliente de Firebase maneja la revocación del token en el dispositivo.
 */