package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.Usuario;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio para Usuario (Núcleo de Autenticación)
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    /**
     * Buscar usuario por email
     */
    Optional<Usuario> findByEmail(String email);

    /**
     * Verificar si existe usuario por email
     */
    boolean existsByEmail(String email);

    /**
     * Buscar usuarios activos
     */
    List<Usuario> findByActivoTrue();
}