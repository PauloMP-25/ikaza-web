package pe.com.ikaza.backend.service;

/**
 * Define las operaciones para la gestión de códigos de verificación
 * por email y teléfono.
 */
public interface VerificacionService {

    // --- Métodos de Verificación de Email ---

    /**
     * Genera y envía un código de verificación al email especificado.
     * 
     * @param email El correo electrónico del usuario.
     */
    void sendEmailVerificationCode(String email);

    /**
     * Verifica si el código provisto para el email es correcto y no ha expirado.
     * Si es exitoso, marca el email del usuario como verificado.
     * 
     * @param email El correo electrónico del usuario.
     * @param code  El código de verificación.
     * @return true si el código es válido; false si es incorrecto.
     * @throws IllegalArgumentException si el código ha expirado.
     */
    boolean verifyEmailCode(String email, String code);

    /**
     * Consulta el estado de verificación del email de un usuario.
     * 
     * @param email El correo electrónico del usuario.
     * @return true si el email está verificado.
     */
    boolean isEmailVerified(String email);

    // --- Métodos de Verificación de Teléfono ---

    /**
     * Genera y envía un código de verificación al número de teléfono especificado.
     * 
     * @param telefono El número de teléfono del usuario.
     */
    void sendPhoneVerificationCode(String telefono);

    /**
     * Verifica si el código provisto para el teléfono es correcto y no ha expirado.
     * Si es exitoso, marca el teléfono del usuario como verificado.
     * 
     * @param email    El email del usuario (usado para identificar al usuario en la
     *                 DB).
     * @param telefono El número de teléfono.
     * @param code     El código de verificación.
     * @return true si el código es válido; false si es incorrecto.
     * @throws IllegalArgumentException si el código ha expirado.
     */
    boolean verifyPhoneCode(String email, String telefono, String code);

    /**
     * Consulta el estado de verificación del teléfono de un usuario.
     * 
     * @param email El correo electrónico del usuario (clave para buscar el estado).
     * @return true si el teléfono está verificado.
     */
    boolean isPhoneVerified(String email);
}