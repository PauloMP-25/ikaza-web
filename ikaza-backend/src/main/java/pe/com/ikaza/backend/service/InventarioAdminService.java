package pe.com.ikaza.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.dto.request.AjusteStockRequest;
import pe.com.ikaza.backend.dto.response.InventarioResponse;
import pe.com.ikaza.backend.dto.response.MovimientoInventarioResponse;
import pe.com.ikaza.backend.entity.Inventario;
import pe.com.ikaza.backend.entity.MovimientoInventario;
import pe.com.ikaza.backend.entity.Producto;
import pe.com.ikaza.backend.entity.Usuario;
import pe.com.ikaza.backend.repository.jpa.InventarioRepository;
import pe.com.ikaza.backend.repository.jpa.MovimientoInventarioRepository;
import pe.com.ikaza.backend.repository.jpa.ProductoRepository;
import pe.com.ikaza.backend.repository.jpa.UsuarioRepository;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio para gestión administrativa de inventario
 * Maneja ajustes manuales de stock por parte de administradores
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class InventarioAdminService {

    private final InventarioRepository inventarioRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;

    /**
     * Obtiene todos los inventarios del sistema
     */
    public List<InventarioResponse> obtenerTodosLosInventarios() {
        log.info("Obteniendo todos los inventarios");
        return inventarioRepository.findAll().stream()
                .map(this::convertirAInventarioResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene el inventario de un producto específico
     */
    public InventarioResponse obtenerInventarioPorProducto(Long idProducto) {
        log.info("Obteniendo inventario para producto: {}", idProducto);
        
        Inventario inventario = inventarioRepository.findByProductoIdProducto(idProducto)
                .orElseThrow(() -> new RuntimeException("Inventario no encontrado para el producto: " + idProducto));
        
        return convertirAInventarioResponse(inventario);
    }

    /**
     * Ajusta el stock de un producto (entrada, salida o ajuste manual)
     * Registra el movimiento en el historial
     */
    @Transactional
    public InventarioResponse ajustarStock(Long idProducto, AjusteStockRequest request, Integer idUsuario) {
        log.info("Ajustando stock para producto: {} - Tipo: {}, Cantidad: {}", 
                idProducto, request.getTipo(), request.getCantidad());

        // Validar entrada
        if (request.getCantidad() <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }

        // Obtener producto
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProducto));

        // Obtener o crear inventario
        Inventario inventario = inventarioRepository.findByProductoIdProducto(idProducto)
                .orElseGet(() -> crearInventarioInicial(producto));

        // Obtener usuario (puede ser null si es un proceso automático)
        Usuario usuario = idUsuario != null ? 
                usuarioRepository.findById(idUsuario).orElse(null) : null;

        // Guardar stock anterior
        int stockAnterior = inventario.getStockActual();

        // Aplicar ajuste según el tipo
        switch (request.getTipo()) {
            case ENTRADA:
                inventario.agregarStock(request.getCantidad());
                break;
                
            case SALIDA:
                if (inventario.getStockActual() < request.getCantidad()) {
                    throw new IllegalArgumentException(
                        String.format("Stock insuficiente. Actual: %d, Solicitado: %d", 
                            inventario.getStockActual(), request.getCantidad())
                    );
                }
                inventario.reducirStock(request.getCantidad());
                break;
                
            case AJUSTE:
                // Para ajustes, determinamos si es entrada o salida
                if (request.getCantidad() > stockAnterior) {
                    // Es un ajuste hacia arriba (entrada)
                    inventario.agregarStock(request.getCantidad() - stockAnterior);
                } else {
                    // Es un ajuste hacia abajo (salida)
                    inventario.reducirStock(stockAnterior - request.getCantidad());
                }
                break;
                
            default:
                throw new IllegalArgumentException("Tipo de movimiento no válido: " + request.getTipo());
        }

        // Guardar inventario actualizado
        inventario = inventarioRepository.save(inventario);

        // Actualizar stock en tabla productos (para compatibilidad)
        producto.setStock(inventario.getStockActual());
        productoRepository.save(producto);

        // Registrar movimiento en el historial
        MovimientoInventario movimiento = new MovimientoInventario(
                usuario,
                producto,
                request.getTipo(),
                request.getCantidad(),
                stockAnterior,
                inventario.getStockActual(),
                request.getMotivo()
        );
        movimientoRepository.save(movimiento);

        log.info("Stock ajustado exitosamente. Stock anterior: {}, Stock nuevo: {}", 
                stockAnterior, inventario.getStockActual());

        return convertirAInventarioResponse(inventario);
    }

    /**
     * Obtiene el historial de movimientos de un producto
     */
    public List<MovimientoInventarioResponse> obtenerMovimientosPorProducto(Long idProducto) {
        log.info("Obteniendo movimientos para producto: {}", idProducto);
        
        List<MovimientoInventario> movimientos = 
                movimientoRepository.findByProductoIdProductoOrderByFechaMovimientoDesc(idProducto);
        
        return movimientos.stream()
                .map(this::convertirAMovimientoResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los últimos movimientos del sistema
     */
    public List<MovimientoInventarioResponse> obtenerUltimosMovimientos(int limite) {
        log.info("Obteniendo últimos {} movimientos", limite);
        
        List<MovimientoInventario> movimientos = 
                movimientoRepository.findTop50ByOrderByFechaMovimientoDesc();
        
        return movimientos.stream()
                .limit(limite)
                .map(this::convertirAMovimientoResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene inventarios con stock bajo
     */
    public List<InventarioResponse> obtenerInventariosConStockBajo() {
        log.info("Obteniendo inventarios con stock bajo");
        
        return inventarioRepository.findInventariosConStockBajo().stream()
                .map(this::convertirAInventarioResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene inventarios sin stock
     */
    public List<InventarioResponse> obtenerInventariosSinStock() {
        log.info("Obteniendo inventarios sin stock");
        
        return inventarioRepository.findInventariosSinStock().stream()
                .map(this::convertirAInventarioResponse)
                .collect(Collectors.toList());
    }

    // --- MÉTODOS PRIVADOS DE UTILIDAD ---

    /**
     * Crea un inventario inicial para un producto que no lo tiene
     */
    private Inventario crearInventarioInicial(Producto producto) {
        Inventario nuevoInventario = new Inventario();
        nuevoInventario.setProducto(producto);
        nuevoInventario.setStockActual(producto.getStock() != null ? producto.getStock() : 0);
        nuevoInventario.setStockReservado(0);
        return inventarioRepository.save(nuevoInventario);
    }

    /**
     * Convierte Inventario a InventarioResponse
     */
    private InventarioResponse convertirAInventarioResponse(Inventario inventario) {
        return new InventarioResponse(
                inventario.getIdInventario(),
                inventario.getProducto().getIdProducto(),
                inventario.getProducto().getNombreProducto(),
                inventario.getStockActual(),
                inventario.getStockReservado(),
                inventario.getStockDisponibleCalculado(),
                inventario.getStockDisponibleCalculado() <= 5
        );
    }

    /**
     * Convierte MovimientoInventario a MovimientoInventarioResponse
     */
    private MovimientoInventarioResponse convertirAMovimientoResponse(MovimientoInventario movimiento) {
        return MovimientoInventarioResponse.builder()
                .idMovimiento(movimiento.getIdMovimiento())
                .idProducto(movimiento.getProducto().getIdProducto())
                .nombreProducto(movimiento.getProducto().getNombreProducto())
                .tipoMovimiento(movimiento.getTipoMovimiento().name())
                .cantidad(movimiento.getCantidad())
                .stockAnterior(movimiento.getStockAnterior())
                .stockNuevo(movimiento.getStockNuevo())
                .motivo(movimiento.getMotivo())
                .fechaMovimiento(movimiento.getFechaMovimiento())
                .nombreUsuario(movimiento.getUsuario() != null ? 
                        movimiento.getUsuario().getNombres() + " " + movimiento.getUsuario().getApellidos() : 
                        "Sistema")
                .build();
    }
}
