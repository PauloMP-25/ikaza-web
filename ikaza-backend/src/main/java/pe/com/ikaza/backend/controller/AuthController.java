package pe.com.ikaza.backend.controller;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.request.LoginRequest;
import pe.com.ikaza.backend.dto.request.RegistroRequest;
import pe.com.ikaza.backend.dto.response.AuthResponse;
import pe.com.ikaza.backend.dto.response.MessageResponse;
import pe.com.ikaza.backend.service.AuthService;

/**
 * Controlador REST para autenticación sin Firebase
 * Maneja registro, login, refresh y logout con JWT nativo
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
     * Registrar nuevo usuario con email/password
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
                    .body(new MessageResponse("Error al registrar usuario", false));
        }
    }

    /**
     * POST /api/auth/login
     * Iniciar sesión con email/password
     * PÚBLICO - No requiere autenticación
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            logger.info("🔐 Intento de login para: {}", request.getEmail());

            AuthResponse response = authService.login(request);

            logger.info("✅ Login exitoso para: {}", request.getEmail());
            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            logger.warn("⚠️ Credenciales inválidas: {}", request.getEmail());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Credenciales inválidas", false));

        } catch (DisabledException e) {
            logger.warn("⚠️ Usuario inactivo: {}", request.getEmail());
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Usuario inactivo. Contacte al administrador.", false));

        } catch (Exception e) {
            logger.error("❌ Error inesperado en login: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse(e.getMessage(), false));
        }
    }

    /**
     * POST /api/auth/refresh
     * Renovar access token usando refresh token
     * PÚBLICO - Usa el refresh token para autenticar
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody String refreshToken) {
        try {
            logger.info("🔄 Solicitando renovación de token");

            AuthResponse response = authService.refreshToken(refreshToken);

            logger.info("✅ Token renovado exitosamente");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Error al renovar token: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Error al renovar token: " + e.getMessage(), false));
        }
    }

    /**
     * POST /api/auth/verificar-token
     * Verificar si un token JWT es válido
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
     * POST /api/auth/logout
     * Cerrar sesión (invalida refresh token)
     * REQUIERE AUTENTICACIÓN
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestParam String email) {
        try {
            logger.info("👋 Cerrando sesión para: {}", email);

            authService.logout(email);

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
     * PÚBLICO - Útil para validación en tiempo real
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
 * FLUJO DE AUTENTICACIÓN CON JWT NATIVO
 * ============================================================
 * 
 * 1. REGISTRO:
 * Frontend → POST /api/auth/registro
 * - Crea usuario en PostgreSQL
 * - Encripta password con BCrypt
 * - Genera access token y refresh token
 * - Retorna tokens y datos del usuario
 * 
 * 2. LOGIN:
 * Frontend → POST /api/auth/login
 * - Valida credenciales con Spring Security
 * - Genera access token (24h) y refresh token (7d)
 * - Retorna tokens y datos del usuario
 * 
 * 3. VERIFICACIÓN DE TOKEN:
 * Frontend → POST /api/auth/verificar-token (con header Authorization)
 * - Valida token JWT
 * - Retorna datos actualizados del usuario
 * 
 * 4. RENOVAR TOKEN:
 * Frontend → POST /api/auth/refresh (con refresh token)
 * - Valida refresh token
 * - Genera nuevo access token
 * - Retorna nuevo token
 * 
 * 5. LOGOUT:
 * Frontend → POST /api/auth/logout
 * - Invalida refresh token en BD
 * - Limpia sesión
 */