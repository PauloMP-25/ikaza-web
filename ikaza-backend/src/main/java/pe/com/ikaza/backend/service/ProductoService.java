package pe.com.ikaza.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.com.ikaza.backend.document.ProductDetail;
import pe.com.ikaza.backend.dto.request.ProductoRequest;
import pe.com.ikaza.backend.dto.request.ProductoUpdateRequest;
import pe.com.ikaza.backend.dto.response.ProductoDetalleResponse;
import pe.com.ikaza.backend.dto.response.ProductoResponse;
import pe.com.ikaza.backend.entity.Categoria;
import pe.com.ikaza.backend.entity.Inventario;
import pe.com.ikaza.backend.entity.Producto;
import pe.com.ikaza.backend.repository.jpa.CategoriaRepository;
import pe.com.ikaza.backend.repository.jpa.InventarioRepository;
import pe.com.ikaza.backend.repository.jpa.ProductoRepository;
import pe.com.ikaza.backend.repository.mongo.ProductDetailRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio para gestionar productos con PostgreSQL + MongoDB
 */
@Service
@Transactional
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private InventarioRepository inventarioRepository;

    @Autowired
    private ProductDetailRepository productDetailRepository;

    /**
     * Obtiene todos los productos con paginación
     */
    @Transactional(readOnly = true)
    public Page<ProductoResponse> obtenerProductosPaginados(Pageable pageable) {
        return productoRepository.findAll(pageable)
                .map(this::convertirAResponse);
    }

    /**
     * Obtiene productos por categoría con paginación
     */
    @Transactional(readOnly = true)
    public Page<ProductoResponse> obtenerProductosPorCategoria(Long idCategoria, Pageable pageable) {
        return productoRepository.findByCategoriaIdCategoria(idCategoria, pageable)
                .map(this::convertirAResponse);
    }

    /**
     * Busca productos por texto con paginación
     */
    @Transactional(readOnly = true)
    public Page<ProductoResponse> buscarProductos(String texto, Pageable pageable) {
        return productoRepository.buscarPorTexto(texto, pageable)
                .map(this::convertirAResponse);
    }

    /**
     * Obtiene un producto por ID (vista simplificada)
     */
    @Transactional(readOnly = true)
    public ProductoResponse obtenerProductoPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + id));
        return convertirAResponse(producto);
    }

    /**
     * Obtiene el detalle completo de un producto (incluye MongoDB)
     */
    @Transactional(readOnly = true)
    public ProductoDetalleResponse obtenerDetalleProducto(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + id));

        ProductoDetalleResponse response = new ProductoDetalleResponse();

        // Información de PostgreSQL
        response.setIdProducto(producto.getIdProducto());
        response.setNombreProducto(producto.getNombreProducto());
        response.setDescripcionProducto(producto.getDescripcionProducto());
        response.setPrecio(producto.getPrecio());
        response.setStock(producto.getStock());
        response.setCalificacionPromedio(producto.getCalificacionPromedio());
        response.setNombreCategoria(producto.getCategoria().getNombreCategoria());
        response.setIdCategoria(producto.getCategoria().getIdCategoria());

        // Información de inventario
        if (producto.getInventario() != null) {
            response.setStockDisponible(producto.getInventario().getStockDisponible());
            response.setStockReservado(producto.getInventario().getStockReservado());
        } else {
            response.setStockDisponible(producto.getStock());
            response.setStockReservado(0);
        }

        // Información de MongoDB (si existe)
        ProductDetail detalle = productDetailRepository.findByProductId(id).orElse(null);
        if (detalle != null) {
            response.setCodigo(detalle.getCodigo());
            response.setMarca(detalle.getMarca());
            response.setAtributos(detalle.getAtributos());

            // Convertir imágenes
            if (detalle.getImagenes() != null) {
                response.setImagenes(detalle.getImagenes().stream()
                        .map(img -> new ProductoDetalleResponse.ImagenDto(
                                img.getUrl(), img.getAlt(), img.getEsPrincipal(), img.getOrden()))
                        .collect(Collectors.toList()));
            }

            // SEO
            if (detalle.getSeo() != null) {
                response.setSeo(new ProductoDetalleResponse.SeoDto(
                        detalle.getSeo().getSlug(),
                        detalle.getSeo().getMetaTitle(),
                        detalle.getSeo().getMetaDescription(),
                        detalle.getSeo().getKeywords()));
            }
        }

        return response;
    }

    /**
     * Crea un nuevo producto
     */
    public ProductoResponse crearProducto(ProductoRequest request) {
        // Validar categoría
        Categoria categoria = categoriaRepository.findById(request.getIdCategoria())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        // Crear producto en PostgreSQL
        Producto producto = new Producto();
        producto.setCategoria(categoria);
        producto.setNombreProducto(request.getNombreProducto());
        producto.setDescripcionProducto(request.getDescripcionProducto());
        producto.setPrecio(request.getPrecio());
        producto.setStock(request.getStock());
        producto.setStockMinimo(request.getStockMinimo());

        Producto guardado = productoRepository.save(producto);

        // Crear inventario automáticamente
        Inventario inventario = new Inventario();
        inventario.setProducto(guardado);
        inventario.setStockActual(request.getStock());
        inventario.setStockReservado(0);
        inventarioRepository.save(inventario);

        // Crear detalles en MongoDB (si hay datos)
        if (tieneDetallesExtendidos(request)) {
            ProductDetail detalle = crearProductDetail(guardado.getIdProducto(), request);
            ProductDetail detalleGuardado = productDetailRepository.save(detalle);
            guardado.setMongoProductId(detalleGuardado.getId());
            productoRepository.save(guardado);
        }

        return convertirAResponse(guardado);
    }

    /**
     * Actualiza un producto existente
     */
    public ProductoResponse actualizarProducto(Long id, ProductoUpdateRequest request) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        // Actualizar campos si se proporcionan
        if (request.getIdCategoria() != null) {
            Categoria categoria = categoriaRepository.findById(request.getIdCategoria())
                    .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            producto.setCategoria(categoria);
        }

        if (request.getNombreProducto() != null && !request.getNombreProducto().isEmpty()) {
            producto.setNombreProducto(request.getNombreProducto());
        }

        if (request.getDescripcionProducto() != null) {
            producto.setDescripcionProducto(request.getDescripcionProducto());
        }

        if (request.getPrecio() != null) {
            producto.setPrecio(request.getPrecio());
        }

        if (request.getStock() != null) {
            producto.setStock(request.getStock());
            // Actualizar inventario también
            Inventario inventario = inventarioRepository.findByProductoIdProducto(id)
                    .orElse(null);

            if (inventario != null) {
                inventario.setStockActual(request.getStock());
                inventarioRepository.save(inventario);
            } else {
                // Crear inventario si no existe
                inventario = new Inventario();
                inventario.setProducto(producto);
                inventario.setStockActual(request.getStock());
                inventario.setStockReservado(0);
                inventarioRepository.save(inventario);
            }
        }

        if (request.getStockMinimo() != null) {
            producto.setStockMinimo(request.getStockMinimo());
        }

        Producto actualizado = productoRepository.save(producto);
        return convertirAResponse(actualizado);
    }

    /**
     * Elimina un producto
     */
    public void eliminarProducto(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        // Eliminar detalles de MongoDB si existen
        if (producto.getMongoProductId() != null) {
            try {
                productDetailRepository.deleteById(producto.getMongoProductId());
            } catch (Exception e) {
                System.err.println("Error eliminando detalles de MongoDB: " + e.getMessage());
            }
        }

        // Eliminar producto (el inventario se elimina en cascada)
        productoRepository.delete(producto);
    }

    /**
     * Obtiene el producto más vendido
     */
    @Transactional(readOnly = true)
    public ProductoDetalleResponse obtenerProductoMasVendido() {
        Producto producto = productoRepository.findProductoMasVendido()
                .orElse(null);

        if (producto == null) {
            return null;
        }

        return obtenerDetalleProducto(producto.getIdProducto());
    }

    /**
     * Obtiene los productos más baratos
     */
    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosMasBaratos(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosMasBaratos(pageable)
                .getContent()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene los productos más recientes
     */
    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosMasRecientes(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosMasRecientes(pageable)
                .getContent()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtiene productos por agotarse (stock entre 5 y 10)
     */
    @Transactional(readOnly = true)
    public List<ProductoResponse> obtenerProductosPorAgotarse(int limite) {
        Pageable pageable = PageRequest.of(0, limite);
        return productoRepository.findProductosPorAgotarse(pageable)
                .getContent()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    // ============================================
    // MÉTODOS AUXILIARES
    // ============================================

    private boolean tieneDetallesExtendidos(ProductoRequest request) {
        return request.getCodigo() != null ||
                request.getMarca() != null ||
                request.getModelo() != null ||
                (request.getImagenesUrls() != null && !request.getImagenesUrls().isEmpty()) ||
                (request.getAtributos() != null && !request.getAtributos().isEmpty());
    }

    private ProductDetail crearProductDetail(Long productId, ProductoRequest request) {
        ProductDetail detalle = new ProductDetail();
        detalle.setProductId(productId);
        detalle.setCodigo(request.getCodigo());
        detalle.setMarca(request.getMarca());
        detalle.setModelo(request.getModelo());
        detalle.setGarantia(request.getGarantia());
        detalle.setAtributos(request.getAtributos());

        // Agregar imágenes si existen
        if (request.getImagenesUrls() != null && !request.getImagenesUrls().isEmpty()) {
            List<ProductDetail.ImagenProducto> imagenes = new ArrayList<>();
            for (int i = 0; i < request.getImagenesUrls().size(); i++) {
                imagenes.add(new ProductDetail.ImagenProducto(
                        request.getImagenesUrls().get(i),
                        request.getNombreProducto(),
                        i == 0, // Primera imagen es principal
                        i));
            }
            detalle.setImagenes(imagenes);
        }

        return detalle;
    }

    private ProductoResponse convertirAResponse(Producto producto) {
        ProductoResponse response = new ProductoResponse();
        response.setIdProducto(producto.getIdProducto());
        response.setNombreProducto(producto.getNombreProducto());
        response.setDescripcionProducto(producto.getDescripcionProducto());
        response.setPrecio(producto.getPrecio());
        response.setStock(producto.getStock());
        response.setStockMinimo(producto.getStockMinimo());
        response.setCalificacionPromedio(producto.getCalificacionPromedio());
        response.setNombreCategoria(producto.getCategoria().getNombreCategoria());
        response.setIdCategoria(producto.getCategoria().getIdCategoria());
        response.setFechaCreacion(producto.getFechaCreacion());
        response.setFechaActualizacion(producto.getFechaActualizacion());
        response.setDisponible(producto.getStock() > 0);

        // Cargar imagen principal y marca de MongoDB si existe
        if (producto.getMongoProductId() != null) {
            try {
                productDetailRepository.findById(producto.getMongoProductId())
                        .ifPresent(detalle -> {
                            ProductDetail.ImagenProducto imgPrincipal = detalle.getImagenPrincipal();
                            if (imgPrincipal != null) {
                                response.setImagenPrincipal(imgPrincipal.getUrl());
                            }
                            response.setMarca(detalle.getMarca());
                            response.setModelo(detalle.getModelo());
                        });
            } catch (Exception e) {
                System.err.println("Error cargando detalles de MongoDB: " + e.getMessage());
            }
        }

        return response;
    }
}