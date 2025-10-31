package pe.com.ikaza.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.dto.request.ProductoRequest;
import pe.com.ikaza.backend.dto.request.ProductoUpdateRequest;
import pe.com.ikaza.backend.dto.response.ProductoDetalleResponse;
import pe.com.ikaza.backend.dto.response.ProductoResponse;
import pe.com.ikaza.backend.entity.*;
import pe.com.ikaza.backend.repository.jpa.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductoDetalleRepository productoDetalleRepository;

    // ========== CONSULTAS PÚBLICAS ==========

    @Transactional(readOnly = true)
    public Page<ProductoResponse> obtenerProductosPaginados(Pageable pageable) {
        return productoRepository.findAll(pageable)
                .map(this::convertirAResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProductoResponse> obtenerProductosPorCategoria(Long idCategoria, Pageable pageable) {
        return productoRepository.findByCategoriaIdCategoria(idCategoria, pageable)
                .map(this::convertirAResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProductoResponse> buscarProductos(String texto, Pageable pageable) {
        return productoRepository.buscarPorTexto(texto, pageable)
                .map(this::convertirAResponse);
    }

    @Transactional(readOnly = true)
    public ProductoResponse obtenerProductoPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + id));
        return convertirAResponse(producto);
    }

    /**
     * ⭐ MÉTODO PRINCIPAL CORREGIDO - Obtiene detalle completo del producto
     */
    @Transactional(readOnly = true)
    public ProductoDetalleResponse obtenerDetalleProducto(Long id) {
        log.info("=== Obteniendo detalle del producto ID: {} ===", id);
        
        // 1. Obtener producto
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + id));

        // 2. ⭐ OBTENER INVENTARIO EXPLÍCITAMENTE (no confiar en la relación lazy)
        Inventario inventario = inventarioRepository.findByProductoIdProducto(id)
                .orElse(null);

        log.info("Inventario encontrado: {}", inventario != null);
        if (inventario != null) {
            log.info("Stock Actual: {}", inventario.getStockActual());
            log.info("Stock Reservado: {}", inventario.getStockReservado());
            log.info("Stock Disponible: {}", inventario.getStockDisponible());
        }

        // 3. Construir response base
        ProductoDetalleResponse response = new ProductoDetalleResponse();
        response.setIdProducto(producto.getIdProducto());
        response.setNombreProducto(producto.getNombreProducto());
        response.setDescripcionProducto(producto.getDescripcionProducto());
        response.setPrecio(producto.getPrecio());
        response.setStock(producto.getStock()); // Campo legacy
        response.setCalificacionPromedio(producto.getCalificacionPromedio());
        
        // Categoría
        if (producto.getCategoria() != null) {
            response.setNombreCategoria(producto.getCategoria().getNombreCategoria());
            response.setIdCategoria(producto.getCategoria().getIdCategoria());
        }

        // 4. ⭐⭐⭐ MAPEAR INVENTARIO CORRECTAMENTE ⭐⭐⭐
        if (inventario != null) {
            response.setStockDisponible(inventario.getStockDisponible());
            response.setStockReservado(inventario.getStockReservado());
            log.info("✅ Stock mapeado correctamente - Disponible: {}, Reservado: {}", 
                    inventario.getStockDisponible(), 
                    inventario.getStockReservado());
        } else {
            // Fallback: usar stock del producto
            response.setStockDisponible(producto.getStock());
            response.setStockReservado(0);
            log.warn("⚠️ No se encontró inventario para producto {}, usando stock legacy", id);
        }

        // 5. Cargar detalles extendidos de MongoDB
        ProductoDetalle detalle = productoDetalleRepository.findByProductoIdProducto(id)
                .orElse(null);
        
        if (detalle != null) {
            log.info("Detalles extendidos encontrados en MongoDB");
            
            // Datos básicos extendidos
            response.setCodigo(detalle.getCodigo());
            response.setMarca(detalle.getMarca());
            response.setModelo(detalle.getModelo());
            response.setGarantia(detalle.getGarantia());
            response.setAtributos(detalle.getAtributos());

            // Imágenes
            if (detalle.getImagenes() != null && !detalle.getImagenes().isEmpty()) {
                response.setImagenes(detalle.getImagenes().stream()
                        .map(img -> new ProductoDetalleResponse.ImagenDto(
                                img.getUrl(), 
                                img.getAlt(), 
                                img.getEsPrincipal(), 
                                img.getOrden()
                        ))
                        .collect(Collectors.toList()));
                log.debug("Imágenes mapeadas: {}", response.getImagenes().size());
            }

            // SEO
            if (detalle.getSeo() != null) {
                response.setSeo(new ProductoDetalleResponse.SeoDto(
                        detalle.getSeo().getSlug(),
                        detalle.getSeo().getMetaTitle(),
                        detalle.getSeo().getMetaDescription(),
                        detalle.getSeo().getKeywords()
                ));
            }

            // Especificaciones
            if (detalle.getEspecificaciones() != null && !detalle.getEspecificaciones().isEmpty()) {
                response.setEspecificaciones(detalle.getEspecificaciones().stream()
                        .map(esp -> new ProductoDetalleResponse.EspecificacionDto(
                                esp.getNombre(), 
                                esp.getValor(), 
                                esp.getUnidad()
                        ))
                        .collect(Collectors.toList()));
                log.debug("Especificaciones mapeadas: {}", response.getEspecificaciones().size());
            }

            // Variantes
            if (detalle.getVariantes() != null && !detalle.getVariantes().isEmpty()) {
                response.setVariantes(detalle.getVariantes().stream()
                        .map(var -> new ProductoDetalleResponse.VarianteDto(
                                var.getSku(), 
                                var.getColor(), 
                                var.getTalla(),
                                var.getMaterial(), 
                                var.getStockAdicional(), 
                                var.getImagenUrl()
                        ))
                        .collect(Collectors.toList()));
                log.debug("Variantes mapeadas: {}", response.getVariantes().size());
            }
        } else {
            log.warn("No se encontraron detalles extendidos en MongoDB para producto {}", id);
        }

        log.info("=== Detalle del producto obtenido exitosamente ===");
        return response;
    }

    // ========== OPERACIONES CRUD ==========

    @Transactional
    public ProductoResponse crearProducto(ProductoRequest request) {
        log.info("Creando nuevo producto: {}", request.getNombreProducto());
        
        Categoria categoria = categoriaRepository.findById(request.getIdCategoria())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        Producto producto = new Producto();
        producto.setCategoria(categoria);
        producto.setNombreProducto(request.getNombreProducto());
        producto.setDescripcionProducto(request.getDescripcionProducto());
        producto.setPrecio(request.getPrecio());
        producto.setStock(request.getStock());
        producto.setStockMinimo(request.getStockMinimo());

        Producto guardado = productoRepository.save(producto);
        log.info("Producto guardado con ID: {}", guardado.getIdProducto());

        // ⭐ Crear inventario automáticamente
        Inventario inventario = new Inventario();
        inventario.setProducto(guardado);
        inventario.setStockActual(request.getStock());
        inventario.setStockReservado(0);
        inventarioRepository.save(inventario);
        log.info("Inventario creado para producto ID: {}", guardado.getIdProducto());

        // Crear detalles extendidos si existen
        if (tieneDetallesExtendidos(request)) {
            crearProductoDetalle(guardado, request);
            log.info("Detalles extendidos creados en MongoDB");
        }

        return convertirAResponse(guardado);
    }

    @Transactional
    public ProductoResponse actualizarProducto(Long id, ProductoUpdateRequest request) {
        log.info("Actualizando producto ID: {}", id);
        
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        // Actualizar categoría
        if (request.getIdCategoria() != null) {
            Categoria categoria = categoriaRepository.findById(request.getIdCategoria())
                    .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            producto.setCategoria(categoria);
        }

        // Actualizar campos básicos
        if (request.getNombreProducto() != null && !request.getNombreProducto().isEmpty()) {
            producto.setNombreProducto(request.getNombreProducto());
        }

        if (request.getDescripcionProducto() != null) {
            producto.setDescripcionProducto(request.getDescripcionProducto());
        }

        if (request.getPrecio() != null) {
            producto.setPrecio(request.getPrecio());
        }

        // ⭐ Actualizar stock en producto E inventario
        if (request.getStock() != null) {
            producto.setStock(request.getStock());
            
            // Actualizar inventario
            Inventario inventario = inventarioRepository.findByProductoIdProducto(id)
                    .orElseGet(() -> {
                        // Crear inventario si no existe
                        Inventario nuevo = new Inventario();
                        nuevo.setProducto(producto);
                        nuevo.setStockReservado(0);
                        return nuevo;
                    });
            
            inventario.setStockActual(request.getStock());
            inventarioRepository.save(inventario);
            log.info("Stock actualizado a: {} (Disponible: {})", 
                    request.getStock(), 
                    inventario.getStockDisponible());
        }

        if (request.getStockMinimo() != null) {
            producto.setStockMinimo(request.getStockMinimo());
        }

        Producto actualizado = productoRepository.save(producto);
        log.info("Producto actualizado exitosamente");
        
        return convertirAResponse(actualizado);
    }

    @Transactional
    public void eliminarProducto(Long id) {
        log.info("Eliminando producto ID: {}", id);
        
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        
        productoRepository.delete(producto);
        log.info("Producto eliminado exitosamente");
    }

    // ========== CONSULTAS ESPECIALES ==========

    @Transactional(readOnly = true)
    public ProductoDetalleResponse obtenerProductoMasVendido() {
        Producto producto = productoRepository.findProductoMasVendido().orElse(null);
        if (producto == null) {
            log.warn("No se encontró producto más vendido");
            return null;
        }
        return obtenerDetalleProducto(producto.getIdProducto());
    }

    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosMasBaratos(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosMasBaratos(pageable)
                .getContent().stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosMasRecientes(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosMasRecientes(pageable)
                .getContent().stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosPorAgotarse(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosPorAgotarse(pageable)
                .getContent().stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    // ========== MÉTODOS AUXILIARES PRIVADOS ==========

    /**
     * Verifica si el request tiene información extendida para MongoDB
     */
    private boolean tieneDetallesExtendidos(ProductoRequest request) {
        return request.getCodigo() != null ||
                request.getMarca() != null ||
                request.getModelo() != null ||
                request.getGarantia() != null ||
                (request.getImagenesUrls() != null && !request.getImagenesUrls().isEmpty()) ||
                (request.getAtributos() != null && !request.getAtributos().isEmpty());
    }

    /**
     * Crea el documento ProductoDetalle en MongoDB
     */
    @Transactional
    protected void crearProductoDetalle(Producto producto, ProductoRequest request) {
        ProductoDetalle detalle = new ProductoDetalle();
        detalle.setProducto(producto);
        detalle.setCodigo(request.getCodigo());
        detalle.setMarca(request.getMarca());
        detalle.setModelo(request.getModelo());
        detalle.setGarantia(request.getGarantia());
        detalle.setAtributos(request.getAtributos() != null ? request.getAtributos() : new HashMap<>());

        // Agregar imágenes
        if (request.getImagenesUrls() != null && !request.getImagenesUrls().isEmpty()) {
            List<ProductoDetalle.ImagenDto> imagenes = new ArrayList<>();
            for (int i = 0; i < request.getImagenesUrls().size(); i++) {
                imagenes.add(new ProductoDetalle.ImagenDto(
                        request.getImagenesUrls().get(i),
                        request.getNombreProducto(),
                        i == 0, // Primera imagen es principal
                        i
                ));
            }
            detalle.setImagenes(imagenes);
        }

        productoDetalleRepository.save(detalle);
    }

    /**
     * Convierte un Producto a ProductoResponse
     */
    private ProductoResponse convertirAResponse(Producto producto) {
        ProductoResponse response = new ProductoResponse();
        response.setIdProducto(producto.getIdProducto());
        response.setNombreProducto(producto.getNombreProducto());
        response.setDescripcionProducto(producto.getDescripcionProducto());
        response.setPrecio(producto.getPrecio());
        response.setStock(producto.getStock());
        response.setStockMinimo(producto.getStockMinimo());
        response.setCalificacionPromedio(producto.getCalificacionPromedio());
        response.setFechaCreacion(producto.getFechaCreacion());
        response.setFechaActualizacion(producto.getFechaActualizacion());
        
        // Categoría
        if (producto.getCategoria() != null) {
            response.setNombreCategoria(producto.getCategoria().getNombreCategoria());
            response.setIdCategoria(producto.getCategoria().getIdCategoria());
        }
        
        // Disponibilidad basada en stock
        response.setDisponible(producto.getStock() > 0);

        // Cargar imagen principal y detalles desde MongoDB
        try {
            productoDetalleRepository.findByProductoIdProducto(producto.getIdProducto())
                    .ifPresent(detalle -> {
                        ProductoDetalle.ImagenDto imgPrincipal = detalle.getImagenPrincipal();
                        if (imgPrincipal != null) {
                            response.setImagenPrincipal(imgPrincipal.getUrl());
                        }
                        response.setMarca(detalle.getMarca());
                        response.setModelo(detalle.getModelo());
                    });
        } catch (Exception e) {
            log.error("Error cargando detalles extendidos para producto {}: {}", 
                    producto.getIdProducto(), e.getMessage());
        }

        return response;
    }
}