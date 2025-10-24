package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Entidad que representa los roles del sistema
 * Mapea a la tabla "roles" de PostgreSQL
 */
@Entity
@Table(name = "roles")
@Data
@AllArgsConstructor
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol")
    private Long idRol;

    @Column(name = "nombre_rol", nullable = false, unique = true, length = 150)
    private String nombreRol;

    @Column(name = "descripcion_rol", columnDefinition = "TEXT")
    private String descripcionRol;

    public Rol() {
        // Constructor vacío necesario para JPA
    }

    /**
     * Constructor para crear un rol básico
     */
    public Rol(String nombreRol, String descripcionRol) {
        this.nombreRol = nombreRol;
        this.descripcionRol = descripcionRol;
    }
}
