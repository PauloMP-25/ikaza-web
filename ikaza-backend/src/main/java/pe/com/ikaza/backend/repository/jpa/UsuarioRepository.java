package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.Usuario;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio para Usuario con integración Firebase
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    /**
     * Buscar usuario por Firebase UID (método principal)
     */
    Optional<Usuario> findByFirebaseUid(String firebaseUid);

    // Retorna boolean - true si existe, false si no
    Optional<Usuario> findByEmailAndFirebaseUidIsNull(String email);

    /**
     * Buscar usuario por email
     */
    Optional<Usuario> findByEmail(String email);

    /**
     * Buscar usuario por número de documento
     */
    Optional<Usuario> findByNumeroDocumento(String numeroDocumento);

    /**
     * Verificar si existe usuario por Firebase UID
     */
    boolean existsByFirebaseUid(String firebaseUid);

    /**
     * Verificar si existe usuario por email
     */
    boolean existsByEmail(String email);

    /**
     * Verificar si existe usuario por número de documento
     */
    boolean existsByNumeroDocumento(String numeroDocumento);

    /**
     * Buscar usuarios activos
     */
    List<Usuario> findByActivoTrue();

    /**
     * Buscar usuarios por rol
     */
    @Query("SELECT u FROM Usuario u WHERE u.rol.nombreRol = :nombreRol")
    List<Usuario> findByRolNombre(@Param("nombreRol") String nombreRol);

    /**
     * Buscar usuarios con datos incompletos
     */
    @Query("SELECT u FROM Usuario u WHERE " +
            "u.numeroDocumento IS NULL OR " +
            "u.telefono IS NULL OR " +
            "u.fechaNacimiento IS NULL")
    List<Usuario> findUsuariosConDatosIncompletos();

    /**
     * Buscar usuarios con teléfono no verificado
     */
    List<Usuario> findByTelefonoVerificadoFalse();
}