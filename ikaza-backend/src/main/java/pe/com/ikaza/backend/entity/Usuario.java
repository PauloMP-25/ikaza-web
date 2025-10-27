package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad Usuario (Core de Autenticación)
 * Contiene solo la información necesaria para el login y el mapping con
 * Firebase.
 */
@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
public class Usuario {

    // =========================================
    // IDENTIFICADORES Y RELACIONES
    // =========================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "firebase_uid", nullable = false, unique = true, length = 128)
    private String firebaseUid; // Clave de Firebase

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    // RELACIÓN UNO A UNO con Cliente
    // Mapeo inverso: 'usuario' es el nombre del campo en la entidad Cliente
    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Cliente cliente; // Referencia a los datos personales

    // =========================================
    // DATOS BÁSICOS (sincronizados con Firebase)
    // =========================================
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    // Columna para guardar la contraseña si fuera necesario, pero se mantiene en ""
    @Column(name = "password", nullable = true)
    private String password = "";

    // =========================================
    // METADATOS
    // =========================================
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
    @PrePersist // <--- ESTO ES CRÍTICO
    protected void onCreate() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
        if (fechaActualizacion == null) {
            fechaActualizacion = LocalDateTime.now();
        }
        if (ultimoAcceso == null) {
            ultimoAcceso = LocalDateTime.now();
        }
        
        if (activo == null) {
             activo = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}