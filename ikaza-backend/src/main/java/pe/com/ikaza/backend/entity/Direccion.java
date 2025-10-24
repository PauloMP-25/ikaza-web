package pe.com.ikaza.backend.entity;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "direcciones")
public class Direccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_direccion")
    private Integer idDireccion; // SERIAL PRIMARY KEY

    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario; // INT NOT NULL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", insertable = false, updatable = false)
    private Usuario usuario; // Relación con la entidad Usuario (existente)
    
    @Column(name = "codigo_postal", length = 10)
    private String codigoPostal;

    @Column(name = "alias", length = 100)
    private String alias; // VARCHAR(100)

    @Column(name = "direccion", nullable = false, length = 255)
    private String direccion; // VARCHAR(255) NOT NULL

    @Column(name = "distrito", length = 100)
    private String distrito; // VARCHAR(100)

    @Column(name = "provincia", length = 100)
    private String provincia; // VARCHAR(100)

    @Column(name = "region", length = 100)
    private String region; // VARCHAR(100)
    
    @Column(name = "pais", nullable = false, length = 100)
    private String pais;

    @Column(name = "referencia")
    private String referencia; // TEXT

    @Column(name = "es_principal", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean esPrincipal; // BOOLEAN DEFAULT FALSE

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    // Asumiremos que aquí se incluirán los campos de coordenadas
    @Column(name = "latitud")
    private Double latitud;

    @Column(name = "longitud")
    private Double longitud;

    // ===========================================
    // CONSTRUCTOR
    // ===========================================

    /**
     * Constructor vacío requerido por JPA.
     */
    public Direccion() {
    }

    // ===========================================
    // GETTERS Y SETTERS
    // ===========================================
    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Integer getIdDireccion() {
        return idDireccion;
    }
    public void setIdDireccion(Integer idDireccion) {
        this.idDireccion = idDireccion;
    }
    
        public String getCodigoPostal() {
        return codigoPostal;
    }
    public void setCodigoPostal(String codigoPostal) {
        this.codigoPostal = codigoPostal;
    }


        public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getDistrito() {
        return distrito;
    }

    public void setDistrito(String distrito) {
        this.distrito = distrito;
    }

    public String getProvincia() {
        return provincia;
    }

    public void setProvincia(String provincia) {
        this.provincia = provincia;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }
    
    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
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

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}