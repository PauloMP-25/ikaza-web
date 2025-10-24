package pe.com.ikaza.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author Paulo
 *         DTO genérico para mensajes de respuesta
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private String message;
    private Boolean success;

    public MessageResponse(String message) {
        this.message = message;
        this.success = true;
    }

    public MessageResponse(String message, boolean success) {
        this.message = message;
        this.success = success;
    }

    // Getters y setters
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }
}
