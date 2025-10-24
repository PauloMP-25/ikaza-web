package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "metodos_pago")
public class Tarjeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_metodo")
    private Integer idMetodo; // SERIAL PRIMARY KEY

    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario; // INT NOT NULL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", insertable = false, updatable = false)
    private Usuario usuario; // Relación con la entidad Usuario

    // Debe ser uno de los CHECK (tipo IN (...))
    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo; 

    @Column(name = "alias", length = 50)
    private String alias; 

    @Column(name = "ultimos_4_digitos", length = 4)
    private String ultimos4Digitos;// VARCHAR(4) [cite: 5]

    @Column(name = "nombre_titular", length = 100)
    private String nombreTitular; // VARCHAR(100)

    @Column(name = "banco_emisor", length = 30)
    private String bancoEmisor; // VARCHAR(30) (Mapeado de 'issuingInstitution') [cite: 9]

    @Column(name = "tipo_tarjeta", length = 20)
    private String tipoTarjeta; // VISA, MASTERCARD, AMEX (Mapeado de 'cardBrand') [cite: 9]

    @Column(name = "fecha_expiracion", length = 7)
    private String fechaExpiracion; // MM/YYYY [cite: 5]

    @Column(name = "token_pago", nullable = false, length = 500)
    private String tokenPago; // Token encriptado de la pasarela [cite: 5]

    @Column(name = "es_principal", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean esPrincipal; // BOOLEAN NOT NULL DEFAULT FALSE

    @Column(name = "activo", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean activo; // BOOLEAN NOT NULL DEFAULT TRUE [cite: 6]

    @Column(name = "fecha_creacion", updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime fechaCreacion; // TIMESTAMP DEFAULT CURRENT_TIMESTAMP [cite: 6]

    // ===========================================
    // CONSTRUCTOR
    // ===========================================
    
    /**
     * Constructor vacío requerido por JPA.
     */
    public Tarjeta() {
    }

    // ===========================================
    // GETTERS Y SETTERS
    // ===========================================

    public Integer getIdMetodo() {
        return idMetodo;
    }

    public void setIdMetodo(Integer idMetodo) {
        this.idMetodo = idMetodo;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

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

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}