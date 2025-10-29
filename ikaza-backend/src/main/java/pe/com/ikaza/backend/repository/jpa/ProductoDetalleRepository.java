package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.ProductoDetalle;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoDetalleRepository extends JpaRepository<ProductoDetalle, Long> {
    
    Optional<ProductoDetalle> findByProductoIdProducto(Long idProducto);
    
    Optional<ProductoDetalle> findByCodigo(String codigo);
    
    List<ProductoDetalle> findByMarca(String marca);
    
    boolean existsByProductoIdProducto(Long idProducto);
    
    void deleteByProductoIdProducto(Long idProducto);
    
    // Búsquedas en JSONB usando PostgreSQL
    @Query(value = "SELECT * FROM producto_detalle WHERE atributos->>'material' = :material", 
           nativeQuery = true)
    List<ProductoDetalle> findByAtributoMaterial(@Param("material") String material);
    
    @Query(value = "SELECT * FROM producto_detalle WHERE atributos->>'color' = :color", 
           nativeQuery = true)
    List<ProductoDetalle> findByAtributoColor(@Param("color") String color);
    
    @Query(value = "SELECT * FROM producto_detalle WHERE seo->>'slug' = :slug", 
           nativeQuery = true)
    Optional<ProductoDetalle> findBySlug(@Param("slug") String slug);
}