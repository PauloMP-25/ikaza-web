package pe.com.ikaza.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * @autor Paulo
 * Entidad que representa el control de inventario de productos
 * Mapea a la tabla "inventario" de PostgreSQL
 */
@Entity
@Table(name = "inventario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Inventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inventario")
    private Long idInventario;

    /**
     * Relación One-to-One con Producto
     * Un inventario pertenece a un producto
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false, unique = true)
    // unique = true: garantiza que un producto tenga solo un inventario
    private Producto producto;

    @Column(name = "stock_actual", nullable = false)
    private Integer stockActual = 0;

    @Column(name = "stock_reservado", nullable = false)
    private Integer stockReservado = 0;

    /**
     * IMPORTANTE: stock_disponible es un campo GENERADO en PostgreSQL
     * stock_disponible = stock_actual - stock_reservado (calculado automáticamente)
     * 
     * Por eso usamos @Column con insertable=false, updatable=false
     * No intentamos escribir en este campo, solo leerlo
     */
    @Column(name = "stock_disponible", insertable = false, updatable = false)
    private Integer stockDisponible;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PrePersist
    protected void onCreate() {
        fechaActualizacion = LocalDateTime.now();
        if (stockActual == null) {
            stockActual = 0;
        }
        if (stockReservado == null) {
            stockReservado = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }

    /**
     * Métodos de utilidad para gestionar el inventario
     */

    /**
     * Agrega stock al inventario (entrada)
     */
    public void agregarStock(Integer cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        this.stockActual += cantidad;
        // stockDisponible se calcula automáticamente en la BD
    }

    /**
     * Reduce stock del inventario (salida)
     */
    public void reducirStock(Integer cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        if (stockActual < cantidad) {
            throw new IllegalStateException("Stock insuficiente. Actual: " + stockActual);
        }
        this.stockActual -= cantidad;
    }

    /**
     * Reserva stock para un pedido pendiente
     */
    public void reservarStock(Integer cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        
        // Calcula el stock disponible manualmente para validar
        int disponible = stockActual - stockReservado;
        
        if (disponible < cantidad) {
            throw new IllegalStateException(
                "Stock disponible insuficiente. Disponible: " + disponible + 
                ", Solicitado: " + cantidad
            );
        }
        
        this.stockReservado += cantidad;
    }

    /**
     * Libera stock reservado (cuando se cancela un pedido)
     */
    public void liberarStockReservado(Integer cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        if (stockReservado < cantidad) {
            throw new IllegalStateException("No hay suficiente stock reservado para liberar");
        }
        this.stockReservado -= cantidad;
    }

    /**
     * Confirma una venta (reduce stock actual y reservado)
     */
    public void confirmarVenta(Integer cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        if (stockReservado < cantidad) {
            throw new IllegalStateException("Stock reservado insuficiente");
        }
        if (stockActual < cantidad) {
            throw new IllegalStateException("Stock actual insuficiente");
        }
        
        this.stockReservado -= cantidad;
        this.stockActual -= cantidad;
    }

    /**
     * Verifica si hay stock disponible
     */
    public boolean hayStockDisponible(Integer cantidad) {
        int disponible = stockActual - stockReservado;
        return disponible >= cantidad;
    }

    /**
     * Obtiene el stock disponible calculado
     */
    public Integer getStockDisponibleCalculado() {
        return stockActual - stockReservado;
    }
}

/**
 * FLUJO DE INVENTARIO:
 * 
 * 1. AGREGAR PRODUCTOS (Entrada):
 *    inventario.agregarStock(100);
 *    -> stockActual = 100, stockReservado = 0, stockDisponible = 100
 * 
 * 2. CLIENTE AGREGA AL CARRITO (Reserva):
 *    inventario.reservarStock(5);
 *    -> stockActual = 100, stockReservado = 5, stockDisponible = 95
 * 
 * 3. CLIENTE COMPRA (Confirma):
 *    inventario.confirmarVenta(5);
 *    -> stockActual = 95, stockReservado = 0, stockDisponible = 95
 * 
 * 4. CLIENTE CANCELA (Libera):
 *    inventario.liberarStockReservado(5);
 *    -> stockActual = 100, stockReservado = 0, stockDisponible = 100
 * 
 * ========================================
 * 
 * ¿Por qué necesitamos stock_reservado?
 * 
 * Imagina este escenario:
 * - Tienes 10 unidades de un producto
 * - Cliente A agrega 8 al carrito (pero no compra aún)
 * - Cliente B quiere comprar 5
 * 
 * Sin stock_reservado:
 * - Ambos podrían intentar comprar (8 + 5 = 13 > 10) ❌
 * 
 * Con stock_reservado:
 * - Cliente A: reserva 8 (disponible = 10 - 8 = 2)
 * - Cliente B: solo puede reservar 2 ✅
 */
