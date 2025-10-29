package pe.com.ikaza.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementación del servicio de verificación.
 * Simula el almacenamiento, generación y validación de códigos.
 * NOTA: En producción, los 'Mapas' deben ser reemplazados por una base de datos
 * (Ej: Redis, Firestore)
 * para persistencia y escalabilidad, y la lógica de envío debe usar un
 * proveedor de SMS/Email.
 */
@Service
public class VerificacionServiceImpl implements VerificacionService {

    private static final Logger logger = LoggerFactory.getLogger(VerificacionServiceImpl.class);
    private final Random random = new Random();

    // Almacenamiento temporal para códigos: Key = email/telefono, Value = Código y
    // Expiración
    private final Map<String, VerificationData> codeStore = new ConcurrentHashMap<>();

    // Simulación del estado de verificación del usuario (Key = email o email_phone)
    private final Map<String, Boolean> userVerificationStatus = new ConcurrentHashMap<>();

    // Tiempo de expiración del código configurable (5 minutos por defecto)
    @Value("${verification.code.expiration.ms:300000}")
    private long codeExpirationMs;

    // Clase interna para guardar el código y la expiración
    private static class VerificationData {
        String code;
        long expirationTime; // System.currentTimeMillis() + codeExpirationMs

        VerificationData(String code, long expirationTime) {
            this.code = code;
            this.expirationTime = expirationTime;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
    }

    /** Genera un código de 6 dígitos aleatorio */
    private String generateCode() {
        return String.format("%06d", random.nextInt(999999));
    }

    // ========================================
    // IMPLEMENTACIÓN DE VERIFICACIÓN DE EMAIL
    // ========================================

    @Override
    public void sendEmailVerificationCode(String email) {
        String code = generateCode();
        long expiration = System.currentTimeMillis() + codeExpirationMs;

        // 1. Almacenar código
        codeStore.put(email, new VerificationData(code, expiration));

        // 2. Simular envío (Aquí iría la llamada al servicio de correo electrónico)
        logger.info("Email Verification: Código ({}) generado y almacenado para {}", code, email);
    }

    @Override
    public boolean verifyEmailCode(String email, String code) {
        VerificationData data = codeStore.get(email);

        if (data == null) {
            return false; // No hay un código pendiente para ese email
        }

        if (data.isExpired()) {
            codeStore.remove(email);
            // Lanza una excepción para que el Controller maneje la respuesta 410 GONE
            // (Código expirado)
            throw new IllegalArgumentException("El código de verificación ha expirado.");
        }

        if (data.code.equals(code)) {
            // Éxito: Limpiar código y marcar email como verificado
            codeStore.remove(email);
            userVerificationStatus.put(email, true);
            logger.info("Verificación de Email: Éxito para {}", email);
            return true;
        }

        // Código incorrecto (no se elimina, permitiendo reintentos)
        return false;
    }

    @Override
    public boolean isEmailVerified(String email) {
        // En un caso real, se consultaría la base de datos de usuarios
        return userVerificationStatus.getOrDefault(email, false);
    }

    // ========================================
    // IMPLEMENTACIÓN DE VERIFICACIÓN DE TELÉFONO
    // ========================================

    @Override
    public void sendPhoneVerificationCode(String telefono) {
        String code = generateCode();
        long expiration = System.currentTimeMillis() + codeExpirationMs;

        // 1. Almacenar código
        codeStore.put(telefono, new VerificationData(code, expiration));

        // 2. Simular envío (Aquí iría la llamada al servicio de SMS, Ej: Twilio)
        logger.info("Phone Verification: Código ({}) generado y almacenado para {}", code, telefono);
    }

    @Override
    public boolean verifyPhoneCode(String email, String telefono, String code) {
        VerificationData data = codeStore.get(telefono);

        if (data == null) {
            return false; // No hay un código pendiente para ese teléfono
        }

        if (data.isExpired()) {
            codeStore.remove(telefono);
            // Lanza excepción para que el Controller devuelva 410 GONE
            throw new IllegalArgumentException("El código de verificación ha expirado.");
        }

        if (data.code.equals(code)) {
            // Éxito: Limpiar código y marcar teléfono como verificado para el usuario
            codeStore.remove(telefono);
            // Usamos una clave compuesta para el estado del teléfono (email + "_phone")
            userVerificationStatus.put(email + "_phone", true);
            logger.info("Verificación de Teléfono: Éxito para el usuario con email {}", email);
            return true;
        }

        // Código incorrecto
        return false;
    }

    @Override
    public boolean isPhoneVerified(String email) {
        // En un caso real, se consultaría la base de datos de usuarios
        return userVerificationStatus.getOrDefault(email + "_phone", false);
    }
}