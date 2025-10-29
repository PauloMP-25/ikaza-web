package pe.com.ikaza.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.com.ikaza.backend.dto.response.MessageResponse;
import pe.com.ikaza.backend.service.VerificacionService;
import java.util.Map;

/**
 * Controlador para verificación de email y teléfono
 * Reemplaza la funcionalidad de Firebase Email Verification y Phone Auth
 */
@RestController
@RequestMapping("/api/verification")
@CrossOrigin(origins = "*", maxAge = 3600)
public class VerificacionController {

    private static final Logger logger = LoggerFactory.getLogger(VerificacionController.class);

    @Autowired
    private VerificacionService verificationService;

    // ========================================
    // VERIFICACIÓN DE EMAIL
    // ========================================

    /**
     * POST /api/verification/email/send
     * Enviar código de verificación por email
     */
    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmailVerificationCode(@RequestBody EmailRequest request) {
        try {
            logger.info("📧 Enviando código de verificación a: {}", request.getEmail());
            
            verificationService.sendEmailVerificationCode(request.getEmail());
            
            return ResponseEntity.ok(new MessageResponse(
                "Código de verificación enviado a tu email",
                true
            ));
        } catch (Exception e) {
            logger.error("❌ Error enviando código de verificación: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Error al enviar código de verificación", false));
        }
    }

    /**
     * POST /api/verification/email/verify
     * Verificar código de email
     */
    @PostMapping("/email/verify")
    public ResponseEntity<?> verifyEmailCode(@RequestBody VerifyEmailRequest request) {
        try {
            logger.info("🔍 Verificando código para email: {}", request.getEmail());
            
            boolean isValid = verificationService.verifyEmailCode(
                request.getEmail(),
                request.getCode()
            );
            
            if (isValid) {
                return ResponseEntity.ok(new MessageResponse("Email verificado exitosamente", true));
            } else {
                return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse("Código incorrecto", false));
            }
        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Código expirado o inválido: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.GONE)
                .body(new MessageResponse("Código expirado. Solicita uno nuevo.", false));
        } catch (Exception e) {
            logger.error("❌ Error verificando código: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Error al verificar código", false));
        }
    }

    /**
     * GET /api/verification/email/status/{email}
     * Verificar estado de email
     */
    @GetMapping("/email/status/{email}")
    public ResponseEntity<?> checkEmailStatus(@PathVariable String email) {
        try {
            boolean isVerified = verificationService.isEmailVerified(email);
            return ResponseEntity.ok(Map.of("verified", isVerified));
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("verified", false));
        }
    }

    // ========================================
    // VERIFICACIÓN DE TELÉFONO
    // ========================================

    /**
     * POST /api/verification/phone/send
     * Enviar código de verificación por SMS
     */
    @PostMapping("/phone/send")
    public ResponseEntity<?> sendPhoneVerificationCode(@RequestBody PhoneRequest request) {
        try {
            logger.info("📱 Enviando código SMS a: {}", request.getTelefono());
            
            verificationService.sendPhoneVerificationCode(request.getTelefono());
            
            return ResponseEntity.ok(new MessageResponse(
                "Código SMS enviado exitosamente",
                true
            ));
        } catch (Exception e) {
            logger.error("❌ Error enviando SMS: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Error al enviar SMS", false));
        }
    }

    /**
     * POST /api/verification/phone/verify
     * Verificar código de teléfono
     */
    @PostMapping("/phone/verify")
    public ResponseEntity<?> verifyPhoneCode(@RequestBody VerifyPhoneRequest request) {
        try {
            logger.info("🔍 Verificando código SMS para: {}", request.getEmail());
            
            boolean isValid = verificationService.verifyPhoneCode(
                request.getEmail(),
                request.getTelefono(),
                request.getCode()
            );
            
            if (isValid) {
                return ResponseEntity.ok(new MessageResponse("Teléfono verificado exitosamente", true));
            } else {
                return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse("Código incorrecto", false));
            }
        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Código expirado o inválido: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.GONE)
                .body(new MessageResponse("Código expirado. Solicita uno nuevo.", false));
        } catch (Exception e) {
            logger.error("❌ Error verificando código SMS: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Error al verificar código", false));
        }
    }

    /**
     * GET /api/verification/phone/status/{email}
     * Verificar estado de teléfono
     */
    @GetMapping("/phone/status/{email}")
    public ResponseEntity<?> checkPhoneStatus(@PathVariable String email) {
        try {
            boolean isVerified = verificationService.isPhoneVerified(email);
            return ResponseEntity.ok(Map.of("verified", isVerified));
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("verified", false));
        }
    }

    // ========================================
    // DTOs INTERNOS
    // ========================================

    public static class EmailRequest {
        private String email;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class VerifyEmailRequest {
        private String email;
        private String code;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
    }

    public static class PhoneRequest {
        private String telefono;
        
        public String getTelefono() { return telefono; }
        public void setTelefono(String telefono) { this.telefono = telefono; }
    }

    public static class VerifyPhoneRequest {
        private String email;
        private String telefono;
        private String code;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getTelefono() { return telefono; }
        public void setTelefono(String telefono) { this.telefono = telefono; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
    }
}