package pe.com.ikaza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginTokenRequest {
    
    @NotBlank(message = "El token de Firebase es obligatorio")
    private String idToken;
}