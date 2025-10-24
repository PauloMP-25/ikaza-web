package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.Rol;

import java.util.Optional;

/**
 * Repositorio para la entidad Rol
 * JpaRepository ya incluye métodos básicos como:
 * - save(), findById(), findAll(), deleteById(), etc.
 */
@Repository // Indica que esta interfaz es un componente de acceso a datos
public interface RolRepository extends JpaRepository<Rol, Long> {
    // JpaRepository<Rol, Long>
    //   - Rol: la entidad que maneja
    //   - Long: el tipo de dato del ID

    /**
     * Busca un rol por su nombre
     * Spring Data JPA genera automáticamente la consulta SQL
     * SELECT * FROM roles WHERE nombre_rol = ?
     */
    Optional<Rol> findByNombreRol(String nombreRol);

    /**
     * Verifica si existe un rol con ese nombre
     * Spring genera: SELECT COUNT(*) > 0 FROM roles WHERE nombre_rol = ?
     */
    boolean existsByNombreRol(String nombreRol);
}