package pe.com.ikaza.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DireccionRequest {

    @Size(max = 100, message = "El alias no puede exceder 100 caracteres")
    private String alias;

    @NotBlank(message = "El país es obligatorio")
    @Size(max = 100, message = "El país no puede exceder 100 caracteres")
    private String pais;

    @NotBlank(message = "La región es obligatoria")
    @Size(max = 100, message = "La región no puede exceder 100 caracteres")
    private String region;

    @NotBlank(message = "La provincia es obligatoria")
    @Size(max = 100, message = "La provincia no puede exceder 100 caracteres")
    private String provincia;

    @NotBlank(message = "El distrito es obligatorio")
    @Size(max = 100, message = "El distrito no puede exceder 100 caracteres")
    private String distrito;

    @NotBlank(message = "La dirección específica es obligatoria")
    @Size(max = 255, message = "La dirección completa no puede exceder 255 caracteres")
    private String direccion;

    // ← FIX: Renombrado a codigoPostal para coincidir con frontend
    @Size(max = 10, message = "El código postal no puede exceder 10 caracteres")
    private String codigoPostal;  // ← Cambiado de 'postal'

    @Size(max = 500, message = "La referencia no puede exceder 500 caracteres")  // ← Opcional: Size para referencia
    private String referencia;

    private Boolean esPrincipal = false;

    private Double latitud;
    private Double longitud;

    // Constructor vacío
    public DireccionRequest() {
    }
    
    // Getters y Setters
    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }
    
    public String getCodigoPostal() {
        return codigoPostal;
    }

    public void setCodigoPostal(String codigoPostal) {
        this.codigoPostal = codigoPostal;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getProvincia() {
        return provincia;
    }

    public void setProvincia(String provincia) {
        this.provincia = provincia;
    }

    public String getDistrito() {
        return distrito;
    }

    public void setDistrito(String distrito) {
        this.distrito = distrito;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getReferencia() {
        return referencia;
    }

    public void setReferencia(String referencia) {
        this.referencia = referencia;
    }

    public Boolean getEsPrincipal() {
        return esPrincipal;
    }

    public void setEsPrincipal(Boolean esPrincipal) {
        this.esPrincipal = esPrincipal;
    }

    public Double getLatitud() {
        return latitud;
    }

    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }

    public Double getLongitud() {
        return longitud;
    }

    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }
}