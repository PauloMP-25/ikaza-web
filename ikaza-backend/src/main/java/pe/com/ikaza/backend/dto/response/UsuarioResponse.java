package pe.com.ikaza.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO de respuesta con datos completos del usuario
 * Combina datos de Firebase + PostgreSQL
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponse {

    private Integer idUsuario;
    private String firebaseUid;
    private String email;
    private String nombres;
    private String apellidos;
    private String nombreCompleto;
    
    // Rol
    private String nombreRol;
    private Boolean isAdmin;

    // Datos extendidos
    private String tipoDocumento;
    private String numeroDocumento;
    private LocalDate fechaNacimiento;
    private Integer edad;
    private String prefijoTelefono;
    private String telefono;
    private Boolean telefonoVerificado;

    // Metadatos
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime ultimoAcceso;
    private LocalDateTime fechaActualizacion;

    // Flag para indicar si tiene datos completos
    private Boolean datosCompletos;
}
