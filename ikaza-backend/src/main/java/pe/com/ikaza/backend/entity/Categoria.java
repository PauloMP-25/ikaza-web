package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * @autor Paulo
 * Entidad que representa las categorías de productos
 * Mapea a la tabla "categorias" de PostgreSQL
 */
@Entity
@Table(name = "categorias")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Long idCategoria;

    @Column(name = "nombre_categoria", nullable = false, unique = true, length = 100)
    private String nombreCategoria;

    @Column(name = "descripcion_categoria", columnDefinition = "TEXT")
    private String descripcionCategoria;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /**
     * Relación One-to-Many con Producto
     * Una categoría puede tener múltiples productos
     * mappedBy: indica que la relación es manejada por el campo "categoria" en Producto
     * cascade: operaciones en cascada (si eliminamos categoría, ¿qué pasa con productos?)
     * orphanRemoval: elimina productos huérfanos (sin categoría)
     */
    @OneToMany(mappedBy = "categoria", cascade = CascadeType.ALL, orphanRemoval = false)
    // orphanRemoval = false: NO eliminar productos si se elimina la categoría
    // En su lugar, el producto quedará con categoria = NULL (gracias al ON DELETE SET NULL en la BD)
    private List<Producto> productos = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (activo == null) {
            activo = true;
        }
    }

    /**
     * Constructor para crear una categoría básica
     */
    public Categoria(String nombreCategoria, String descripcionCategoria) {
        this.nombreCategoria = nombreCategoria;
        this.descripcionCategoria = descripcionCategoria;
        this.activo = true;
    }

    /**
     * Método de utilidad para agregar un producto a la categoría
     */
    public void agregarProducto(Producto producto) {
        productos.add(producto);
        producto.setCategoria(this);
    }

    /**
     * Método de utilidad para remover un producto de la categoría
     */
    public void removerProducto(Producto producto) {
        productos.remove(producto);
        producto.setCategoria(null);
    }
}

/**
 * EXPLICACIÓN DE CONCEPTOS:
 * 
 * 1. @OneToMany: Relación uno a muchos
 *    - Una categoría tiene muchos productos
 *    - mappedBy = "categoria": el lado "dueño" de la relación está en Producto
 * 
 * 2. CascadeType:
 *    - ALL: todas las operaciones se propagan (persist, merge, remove, etc.)
 *    - PERSIST: si guardas la categoría, guarda los productos también
 *    - REMOVE: si eliminas la categoría, elimina los productos
 *    
 * 3. orphanRemoval:
 *    - true: elimina productos que ya no pertenecen a ninguna categoría
 *    - false: mantiene los productos aunque se elimine la categoría
 * 
 * 4. ¿Por qué usamos ArrayList<>()?
 *    - Para evitar NullPointerException al agregar productos
 *    - Inicializa la lista vacía en lugar de null
 */
