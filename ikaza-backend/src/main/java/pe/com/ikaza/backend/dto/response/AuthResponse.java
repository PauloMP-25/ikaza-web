package pe.com.ikaza.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    // Token de Firebase
    private String token;
    private String refreshToken;

    // Información del usuario
    private Integer idUsuario;
    private String email;
    
    // Rol y permisos
    private String rol;
    private Boolean isAdmin;

    // Información adicional
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime ultimoAcceso;

    // Mensaje de respuesta
    private String mensaje;
    private Boolean success;
}