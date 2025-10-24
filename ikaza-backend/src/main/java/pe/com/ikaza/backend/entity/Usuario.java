package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entidad Usuario sincronizada con Firebase Auth
 * Firebase maneja: email, password, emailVerified
 * PostgreSQL maneja: datos personales extendidos
 */
@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    // =========================================
    // IDENTIFICADORES Y RELACIONES
    // =========================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "firebase_uid", nullable = false, unique = true, length = 128)
    private String firebaseUid;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    // =========================================
    // DATOS BÁSICOS (sincronizados con Firebase)
    // =========================================
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "nombres", nullable = false, length = 100)
    private String nombres;

    @Column(name = "apellidos", nullable = false, length = 100)
    private String apellidos;

    // =========================================
    // DATOS EXTENDIDOS (solo en PostgreSQL)
    // =========================================
    @Column(name = "tipo_documento", length = 20)
    private String tipoDocumento;

    @Column(name = "numero_documento", unique = true, length = 20)
    private String numeroDocumento;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "prefijo_telefono", length = 5)
    private String prefijoTelefono;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "telefono_verificado", nullable = false)
    private Boolean telefonoVerificado = false;

    // =========================================
    // METADATOS
    // =========================================
    @Column(name = "password", nullable = true)
    private String password = "";

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "ultimo_acceso")
    private LocalDateTime ultimoAcceso;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    // =========================================
    // MÉTODOS DE CICLO DE VIDA
    // =========================================
    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
        ultimoAcceso = LocalDateTime.now();
        if (activo == null) {
            activo = true;
        }
        if (telefonoVerificado == null) {
            telefonoVerificado = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }

    // =========================================
    // MÉTODOS PERSONALIZADOS
    // =========================================
    public String getNombreCompleto() {
        return nombres + " " + apellidos;
    }

    public boolean esMayorDeEdad() {
        if (fechaNacimiento == null)
            return false;
        LocalDate hoy = LocalDate.now();
        int edad = hoy.getYear() - fechaNacimiento.getYear();
        if (hoy.getMonthValue() < fechaNacimiento.getMonthValue() ||
                (hoy.getMonthValue() == fechaNacimiento.getMonthValue() &&
                        hoy.getDayOfMonth() < fechaNacimiento.getDayOfMonth())) {
            edad--;
        }
        return edad >= 18;
    }

    // =========================================
    // GETTERS Y SETTERS MANUALES
    // =========================================
    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getFirebaseUid() {
        return firebaseUid;
    }

    public void setFirebaseUid(String firebaseUid) {
        this.firebaseUid = firebaseUid;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public void setApellidos(String apellidos) {
        this.apellidos = apellidos;
    }

    public String getTipoDocumento() {
        return tipoDocumento;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getNumeroDocumento() {
        return numeroDocumento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public String getPrefijoTelefono() {
        return prefijoTelefono;
    }

    public void setPrefijoTelefono(String prefijoTelefono) {
        this.prefijoTelefono = prefijoTelefono;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public Boolean getTelefonoVerificado() {
        return telefonoVerificado;
    }

    public void setTelefonoVerificado(Boolean telefonoVerificado) {
        this.telefonoVerificado = telefonoVerificado;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

    public LocalDateTime getUltimoAcceso() {
        return ultimoAcceso;
    }

    public void setUltimoAcceso(LocalDateTime ultimoAcceso) {
        this.ultimoAcceso = ultimoAcceso;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
}
