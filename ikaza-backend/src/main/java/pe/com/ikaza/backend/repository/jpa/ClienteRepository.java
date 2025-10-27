package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.Cliente;

import java.util.Optional;
import java.util.List;

/**
 * Repositorio para la entidad Cliente (Datos de perfil)
 */
@Repository

public interface ClienteRepository extends JpaRepository<Cliente, Integer> {

    // Buscar Cliente por ID de Usuario (FK)
    Optional<Cliente> findByUsuarioIdUsuario(Integer idUsuario);

    // Buscar  Cliente por número de documento (para evitar duplicados)
    boolean existsByNumeroDocumento(String numeroDocumento);

    /**
    * Buscar Cliente por número de documento
    */
    Optional<Cliente> findByNumeroDocumento(String numeroDocumento);

    //Obtener clientes y sus usuarios relacionados
    @Query("SELECT c FROM Cliente c JOIN FETCH c.usuario u WHERE u.activo = true")
    List<Cliente> findClientesActivosConUsuario();

    //Contar clientes por si tienen datos incompletos
    @Query("SELECT COUNT(c) FROM Cliente c WHERE " +
            "c.numeroDocumento IS NULL OR " +
            "c.telefono IS NULL OR " +
            "c.fechaNacimiento IS NULL")
    Long countClientesConDatosIncompletos();

    //Contar clientes con teléfono verificado
    @Query("SELECT COUNT(c) FROM Cliente c WHERE c.telefonoVerificado = true")
    Long countClientesConTelefonoVerificado();

    //Contar clientes por género
    @Query("SELECT COUNT(c) FROM Cliente c WHERE c.genero = :genero")
    Long countByGenero(@Param("genero") String genero);
}