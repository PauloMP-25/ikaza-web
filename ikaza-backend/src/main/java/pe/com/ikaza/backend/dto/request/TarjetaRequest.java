package pe.com.ikaza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class TarjetaRequest {

    // Datos necesarios para persistir, obtenidos luego de la validación IIN y el token de la pasarela
    
    @NotBlank(message = "El tipo de método es obligatorio")
    private String tipo; // Ej: TARJETA_CREDITO, TARJETA_DEBITO
    
    @NotBlank(message = "El token de pago es obligatorio")
    private String tokenPago; // TOKEN ENCRIPTADO (CRUCIAL)

    @Size(min = 4, max = 4, message = "Los últimos 4 dígitos deben ser 4 caracteres")
    private String ultimos4Digitos;

    private String alias;
    private String nombreTitular;
    private String bancoEmisor; // issuingInstitution
    private String tipoTarjeta; // cardBrand
    private Boolean esPrincipal = false;
    
    @Pattern(regexp = "^(0[1-9]|1[0-2])\\/\\d{2}$", message = "Formato de expiración inválido (MM/YY)")
    private String fechaExpiracion;

    // ===========================================
    // GETTERS Y SETTERS
    // ===========================================


    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public String getUltimos4Digitos() {
        return ultimos4Digitos;
    }

    public void setUltimos4Digitos(String ultimos4Digitos) {
        this.ultimos4Digitos = ultimos4Digitos;
    }

    public String getNombreTitular() {
        return nombreTitular;
    }

    public void setNombreTitular(String nombreTitular) {
        this.nombreTitular = nombreTitular;
    }

    public String getBancoEmisor() {
        return bancoEmisor;
    }

    public void setBancoEmisor(String bancoEmisor) {
        this.bancoEmisor = bancoEmisor;
    }

    public String getTipoTarjeta() {
        return tipoTarjeta;
    }

    public void setTipoTarjeta(String tipoTarjeta) {
        this.tipoTarjeta = tipoTarjeta;
    }

    public String getFechaExpiracion() {
        return fechaExpiracion;
    }

    public void setFechaExpiracion(String fechaExpiracion) {
        this.fechaExpiracion = fechaExpiracion;
    }

    public String getTokenPago() {
        return tokenPago;
    }

    public void setTokenPago(String tokenPago) {
        this.tokenPago = tokenPago;
    }

    public Boolean getEsPrincipal() {
        return esPrincipal;
    }

    public void setEsPrincipal(Boolean esPrincipal) {
        this.esPrincipal = esPrincipal;
    }
}