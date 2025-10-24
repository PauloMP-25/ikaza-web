package pe.com.ikaza.backend.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import pe.com.ikaza.backend.document.ProductDetail;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para el documento ProductDetail en MongoDB
 * MongoRepository proporciona métodos CRUD automáticos
 */
@Repository
public interface ProductDetailRepository extends MongoRepository<ProductDetail, String> {
    // String es el tipo del ID (ObjectId como String)

    /**
     * Busca el detalle de un producto por su ID en PostgreSQL
     */
    Optional<ProductDetail> findByProductId(Long productId);

    /**
     * Busca detalles por código/SKU
     */
    Optional<ProductDetail> findByCodigo(String codigo);

    /**
     * Busca productos por marca
     */
    List<ProductDetail> findByMarca(String marca);

    /**
     * Busca productos por slug SEO
     */
    Optional<ProductDetail> findBySeoSlug(String slug);

    /**
     * Busca productos que contengan un atributo específico
     * Ejemplo: buscar todos los productos de "Algodón"
     */
    @Query("{ 'atributos.material': ?0 }")
    List<ProductDetail> findByAtributoMaterial(String material);

    /**
     * Busca productos por color en variantes
     */
    @Query("{ 'variantes.color': ?0 }")
    List<ProductDetail> findByVarianteColor(String color);

    /**
     * Busca productos por talla en variantes
     */
    @Query("{ 'variantes.talla': ?0 }")
    List<ProductDetail> findByVarianteTalla(String talla);

    /**
     * Verifica si existe un detalle para un producto
     */
    boolean existsByProductId(Long productId);

    /**
     * Elimina el detalle de un producto
     */
    void deleteByProductId(Long productId);
}

/**
 * EXPLICACIÓN DE QUERIES EN MONGODB:
 * 
 * MongoDB usa JSON para queries, no SQL.
 * 
 * Ejemplo 1: Buscar por campo simple
 * @Query("{ 'marca': ?0 }")
 * - ?0 es el primer parámetro del método
 * - Equivale a: db.product_details.find({ marca: "Samsung" })
 * 
 * Ejemplo 2: Buscar en campos anidados
 * @Query("{ 'seo.slug': ?0 }")
 * - Busca dentro del objeto 'seo', campo 'slug'
 * - Equivale a: db.product_details.find({ "seo.slug": "camisa-roja" })
 * 
 * Ejemplo 3: Buscar en arrays de objetos
 * @Query("{ 'variantes.color': ?0 }")
 * - Busca en el array 'variantes', si algún objeto tiene ese color
 * - Equivale a: db.product_details.find({ "variantes.color": "Rojo" })
 * 
 * ========================================
 * 
 * VENTAJAS DE MONGOREPOSITORY:
 * 
 * 1. Métodos automáticos (igual que JPA):
 *    - save(entity)
 *    - findById(id)
 *    - findAll()
 *    - deleteById(id)
 *    - count()
 * 
 * 2. Queries por nombre de método:
 *    - findByMarca(String marca) → MongoDB genera la query automáticamente
 *    - findByProductId(Long id) → busca por el campo productId
 * 
 * 3. Queries personalizadas con @Query:
 *    - Para búsquedas complejas
 *    - Usa sintaxis JSON de MongoDB
 * 
 * 4. Flexibilidad:
 *    - Puedes guardar documentos con campos diferentes
 *    - No necesitas migrar esquemas
 */