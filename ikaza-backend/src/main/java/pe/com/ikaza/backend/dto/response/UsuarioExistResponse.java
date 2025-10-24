package pe.com.ikaza.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO simplificado para verificar si existe un usuario
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioExistResponse {
    private Boolean existe;
    private String mensaje;
    private Integer idUsuario;
    private String email;
}
