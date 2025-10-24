package pe.com.ikaza.backend.repository.jpa;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.entity.Producto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio para la entidad Producto
 */
@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

       /**
        * Busca productos por categoría
        */
       List<Producto> findByCategoriaIdCategoria(Long idCategoria);

       /**
        * Busca productos por categoría con paginación
        * Pageable permite dividir los resultados en páginas
        */
       Page<Producto> findByCategoriaIdCategoria(Long idCategoria, Pageable pageable);

       /**
        * Busca productos por nombre (búsqueda parcial, sin importar mayúsculas)
        */
       List<Producto> findByNombreProductoContainingIgnoreCase(String nombre);

       /**
        * Busca productos con paginación (para el catálogo)
        */
       Page<Producto> findAll(Pageable pageable);

       /**
        * Busca productos con stock disponible
        */
       List<Producto> findByStockGreaterThan(Integer stock);

       @Query("SELECT p FROM Producto p WHERE p.idProducto IN :ids")
       List<Producto> findAllByIdIn(@Param("ids") List<Long> ids);

       // Método para verificar y actualizar stock
       @Query("UPDATE Producto p SET p.stock = p.stock - :cantidad " +
                     "WHERE p.idProducto = :idProducto AND p.stock >= :cantidad")
       int actualizarStock(
                     @Param("idProducto") Long idProducto,
                     @Param("cantidad") Integer cantidad);

       /**
        * Busca productos que necesitan reposición
        */
       @Query("SELECT p FROM Producto p WHERE p.stock <= p.stockMinimo")
       List<Producto> findProductosConBajoStock();

       /**
        * Busca productos por rango de precio
        */
       List<Producto> findByPrecioBetween(BigDecimal precioMin, BigDecimal precioMax);

       /**
        * Busca productos por categoría y rango de precio con paginación
        */
       Page<Producto> findByCategoriaIdCategoriaAndPrecioBetween(
                     Long idCategoria,
                     BigDecimal precioMin,
                     BigDecimal precioMax,
                     Pageable pageable);

       /**
        * Búsqueda avanzada: nombre o descripción contiene el texto
        */
       @Query("SELECT p FROM Producto p WHERE " +
                     "LOWER(p.nombreProducto) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
                     "LOWER(p.descripcionProducto) LIKE LOWER(CONCAT('%', :texto, '%'))")
       List<Producto> buscarPorTexto(@Param("texto") String texto);

       /**
        * Búsqueda con paginación
        */
       @Query("SELECT p FROM Producto p WHERE " +
                     "LOWER(p.nombreProducto) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
                     "LOWER(p.descripcionProducto) LIKE LOWER(CONCAT('%', :texto, '%'))")
       Page<Producto> buscarPorTexto(@Param("texto") String texto, Pageable pageable);

       /**
        * Obtiene el producto más vendido (por calificación)
        */
       @Query("SELECT p FROM Producto p WHERE p.stock > 0 ORDER BY p.calificacionPromedio DESC, p.fechaCreacion DESC LIMIT 1")
       Optional<Producto> findProductoMasVendido();

       /**
        * Obtiene los N productos más baratos con stock disponible
        */
       @Query("SELECT p FROM Producto p WHERE p.stock > 0 ORDER BY p.precio ASC")
       Page<Producto> findProductosMasBaratos(Pageable pageable);

       /**
        * Obtiene los N productos más recientes
        */
       @Query("SELECT p FROM Producto p ORDER BY p.fechaCreacion DESC")
       Page<Producto> findProductosMasRecientes(Pageable pageable);

       /**
        * Obtiene productos con stock entre 5 y 10 (por agotarse)
        */
       @Query("SELECT p FROM Producto p WHERE p.stock BETWEEN 5 AND 10 ORDER BY p.stock ASC")
       Page<Producto> findProductosPorAgotarse(Pageable pageable);

       /**
        * Verifica si existe un producto con ese nombre en una categoría
        */
       boolean existsByNombreProductoAndCategoriaIdCategoria(
                     String nombreProducto,
                     Long idCategoria);

       /**
        * Cuenta productos por categoría
        */
       @Query("SELECT COUNT(p) FROM Producto p WHERE p.categoria.idCategoria = :idCategoria")
       long contarProductosPorCategoria(@Param("idCategoria") Long idCategoria);
}

/**
 * EXPLICACIÓN DE PAGEABLE:
 * 
 * Pageable es una interfaz de Spring Data que permite:
 * - Dividir resultados en páginas
 * - Ordenar resultados
 * - Limitar número de elementos por página
 * 
 * Ejemplo de uso:
 * 
 * // Crear un Pageable para la página 0 (primera), 20 elementos, ordenado por
 * nombre
 * Pageable pageable = PageRequest.of(0, 20,
 * Sort.by("nombreProducto").ascending());
 * 
 * // Buscar productos con paginación
 * Page<Producto> pagina = productoRepository.findAll(pageable);
 * 
 * // Información de la página
 * List<Producto> productos = pagina.getContent(); // Los productos de esta
 * página
 * int numeroPagina = pagina.getNumber(); // Número de página actual
 * int totalPaginas = pagina.getTotalPages(); // Total de páginas
 * long totalElementos = pagina.getTotalElements(); // Total de productos
 * boolean tieneSiguiente = pagina.hasNext(); // ¿Hay página siguiente?
 * boolean tieneAnterior = pagina.hasPrevious(); // ¿Hay página anterior?
 * 
 * ========================================
 * 
 * ¿POR QUÉ PAGINACIÓN?
 * 
 * Imagina que tienes 10,000 productos:
 * - Sin paginación: cargar 10,000 productos a la vez = lento, mucha memoria
 * - Con paginación: cargar 20 productos a la vez = rápido, eficiente
 * 
 * Beneficios:
 * - Mejor rendimiento
 * - Menos uso de memoria
 * - Mejor experiencia de usuario (carga más rápida)
 * - Menos tráfico de red
 */