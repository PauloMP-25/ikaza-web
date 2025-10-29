package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_producto")
    private Long idProducto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    @Column(name = "nombre_producto", nullable = false, length = 200)
    private String nombreProducto;

    @Column(name = "descripcion_producto", length = 500)
    private String descripcionProducto;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(name = "stock", nullable = false)
    private Integer stock = 0;

    @Column(name = "stock_minimo")
    private Integer stockMinimo = 5;

    @Column(name = "calificacion_promedio", precision = 3, scale = 2)
    private BigDecimal calificacionPromedio = BigDecimal.ZERO;

    // ❌ ELIMINAR ESTA LÍNEA:
    // @Column(name = "mongo_product_id", length = 24)
    // private String mongoProductId;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @OneToOne(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    private Inventario inventario;

    // ✅ AGREGAR ESTA RELACIÓN:
    @OneToOne(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    private ProductoDetalle detalle;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
        if (stock == null) stock = 0;
        if (stockMinimo == null) stockMinimo = 5;
        if (calificacionPromedio == null) calificacionPromedio = BigDecimal.ZERO;
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
/**
 * EXPLICACIÓN DE BigDecimal:
 * 
 * ¿Por qué usamos BigDecimal en lugar de double o float?
 * 
 * - double y float tienen problemas de precisión con decimales
 * - Ejemplo: 0.1 + 0.2 = 0.30000000000000004 (¡error!)
 * 
 * - BigDecimal es exacto y perfecto para dinero
 * - Ejemplo: BigDecimal.valueOf(0.1).add(BigDecimal.valueOf(0.2)) = 0.3 (correcto)
 * 
 * Cómo usar BigDecimal:
 * - Crear: BigDecimal.valueOf(10.50)
 * - Sumar: precio.add(otroValor)
 * - Restar: precio.subtract(descuento)
 * - Multiplicar: precio.multiply(cantidad)
 * - Dividir: precio.divide(divisor, 2, RoundingMode.HALF_UP)
 * - Comparar: precio.compareTo(otroValor) > 0
 * 
 * ========================================
 * 
 * EXPLICACIÓN DE @OneToOne:
 * 
 * Producto <-> Inventario es una relación 1 a 1
 * - Un producto tiene UN solo registro de inventario
 * - Un inventario pertenece a UN solo producto
 * 
 * mappedBy = "producto":
 * - La relación es manejada por el campo "producto" en Inventario
 * - Inventario tiene la foreign key (id_producto)
 * 
 * cascade = CascadeType.ALL:
 * - Al guardar un producto, guarda su inventario automáticamente
 * - Al actualizar un producto, actualiza su inventario
 * 
 * orphanRemoval = true:
 * - Si eliminamos un producto, su inventario también se elimina
 */