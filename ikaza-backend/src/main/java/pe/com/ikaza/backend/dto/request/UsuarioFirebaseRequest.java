package pe.com.ikaza.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO para sincronizar usuario de Firebase con PostgreSQL
 * Se llama después del registro exitoso en Firebase
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioFirebaseRequest {

    @NotBlank(message = "El UID de Firebase es obligatorio")
    private String firebaseUid;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Email inválido")
    private String email;

    // Datos opcionales en el registro
    private String nombres;
    private String apellidos;
    private String tipoDocumento;
    private String numeroDocumento;
    private LocalDate fechaNacimiento;
    private String prefijoTelefono;
    private String telefono;
}
