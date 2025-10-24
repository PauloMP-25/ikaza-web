package pe.com.ikaza.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO para actualizar datos extendidos del usuario
 * (datos que NO están en Firebase)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioExtendidoRequest {

    @Size(max = 100)
    private String nombres;

    @Size(max = 100)
    private String apellidos;

    private String tipoDocumento; // DNI, CE, RUC, PASAPORTE

    @Pattern(regexp = "^[0-9]{8}$", message = "DNI debe tener 8 dígitos")
    private String numeroDocumento;

    @Past(message = "La fecha de nacimiento debe ser en el pasado")
    private LocalDate fechaNacimiento;

    @Pattern(regexp = "^\\+\\d{1,3}$", message = "Prefijo telefónico inválido")
    private String prefijoTelefono;

    @Pattern(regexp = "^[0-9]{9}$", message = "Teléfono debe tener 9 dígitos")
    private String telefono;

    private Boolean telefonoVerificado;
}