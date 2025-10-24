package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad que registra todos los movimientos de inventario
 * Sirve para auditoría y trazabilidad
 * Mapea a la tabla "movimientos_inventario" de PostgreSQL
 */
@Entity
@Table(name = "movimientos_inventario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    private Long idMovimiento;

    /**
     * Usuario que realizó el movimiento (puede ser null si es automático)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    /**
     * Producto afectado por el movimiento
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(name = "tipo_movimiento", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    // @Enumerated: convierte el enum a String en la BD
    private TipoMovimiento tipoMovimiento;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    @Column(name = "stock_anterior", nullable = false)
    private Integer stockAnterior;

    @Column(name = "stock_nuevo", nullable = false)
    private Integer stockNuevo;

    @Column(name = "motivo", length = 255)
    private String motivo;

    @Column(name = "fecha_movimiento", nullable = false, updatable = false)
    private LocalDateTime fechaMovimiento;

    @PrePersist
    protected void onCreate() {
        fechaMovimiento = LocalDateTime.now();
    }

    /**
     * Enum para tipos de movimiento
     * Coincide con el CHECK constraint de la BD
     */
    public enum TipoMovimiento {
        ENTRADA("Entrada de mercancía"),
        SALIDA("Salida por venta"),
        AJUSTE("Ajuste de inventario"),
        DEVOLUCION("Devolución de cliente");

        private final String descripcion;

        TipoMovimiento(String descripcion) {
            this.descripcion = descripcion;
        }

        public String getDescripcion() {
            return descripcion;
        }
    }

    /**
     * Constructor para crear un movimiento rápidamente
     */
    public MovimientoInventario(Usuario usuario, Producto producto, 
                                TipoMovimiento tipo, Integer cantidad,
                                Integer stockAnterior, Integer stockNuevo, 
                                String motivo) {
        this.usuario = usuario;
        this.producto = producto;
        this.tipoMovimiento = tipo;
        this.cantidad = cantidad;
        this.stockAnterior = stockAnterior;
        this.stockNuevo = stockNuevo;
        this.motivo = motivo;
    }
}

/**
 * EJEMPLO DE USO:
 * 
 * // Entrada de mercancía
 * MovimientoInventario entrada = new MovimientoInventario(
 *     usuarioAdmin,              // Quien hizo el movimiento
 *     producto,                  // Producto afectado
 *     TipoMovimiento.ENTRADA,    // Tipo
 *     50,                        // Cantidad
 *     100,                       // Stock antes
 *     150,                       // Stock después
 *     "Compra a proveedor XYZ"   // Motivo
 * );
 * 
 * // Salida por venta (automática)
 * MovimientoInventario salida = new MovimientoInventario(
 *     null,                      // Sistema (sin usuario)
 *     producto,
 *     TipoMovimiento.SALIDA,
 *     5,
 *     150,
 *     145,
 *     "Venta pedido #12345"
 * );
 * 
 * // Ajuste de inventario
 * MovimientoInventario ajuste = new MovimientoInventario(
 *     usuarioAdmin,
 *     producto,
 *     TipoMovimiento.AJUSTE,
 *     -10,                       // Negativo = reducción
 *     145,
 *     135,
 *     "Productos dañados"
 * );
 */