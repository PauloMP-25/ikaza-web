package pe.com.ikaza.backend.document;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Documento de MongoDB que almacena información extendida de productos
 * Cosas dinámicas que no caben bien en una tabla relacional
 */
@Document(collection = "product_details")
// @Document: indica que esta clase es un documento de MongoDB
// collection: nombre de la colección en MongoDB
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetail {

    @Id
    // En MongoDB, el ID es un String (ObjectId)
    private String id;

    /**
     * Referencia al producto en PostgreSQL
     * Conecta MongoDB con PostgreSQL
     */
    @Field("product_id")
    private Long productId;

    @Field("codigo")
    private String codigo; // SKU o código de barras

    /**
     * IMÁGENES DEL PRODUCTO
     * Lista de URLs de imágenes
     */
    @Field("imagenes")
    private List<ImagenProducto> imagenes = new ArrayList<>();

    /**
     * ATRIBUTOS DINÁMICOS
     * Map para almacenar cualquier característica del producto
     * Ejemplo: {"color": "Rojo", "material": "Algodón", "peso": "500g"}
     */
    @Field("atributos")
    private Map<String, String> atributos = new HashMap<>();

    /**
     * ESPECIFICACIONES TÉCNICAS
     * Lista de especificaciones detalladas
     */
    @Field("especificaciones")
    private List<Especificacion> especificaciones = new ArrayList<>();

    /**
     * VARIANTES DEL PRODUCTO
     * Para productos con opciones (tallas, colores)
     */
    @Field("variantes")
    private List<Variante> variantes = new ArrayList<>();

    /**
     * INFORMACIÓN SEO
     */
    @Field("seo")
    private SeoInfo seo;

    /**
     * INFORMACIÓN ADICIONAL
     */
    @Field("marca")
    private String marca;

    @Field("modelo")
    private String modelo;

    @Field("garantia")
    private String garantia;

    @Field("instrucciones_uso")
    private String instruccionesUso;

    @Field("fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Field("fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    // ============================================
    // CLASES INTERNAS (Subdocumentos)
    // ============================================

    /**
     * Clase para representar una imagen
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImagenProducto {
        private String url;
        private String alt; // Texto alternativo para SEO
        private Boolean esPrincipal = false;
        private Integer orden = 0;
    }

    /**
     * Clase para especificaciones técnicas
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Especificacion {
        private String nombre;
        private String valor;
        private String unidad; // Ej: "cm", "kg", "litros"
    }

    /**
     * Clase para variantes del producto
     * Ejemplo: Talla M, Color Rojo
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Variante {
        private String sku; // Código único de la variante
        private String color;
        private String talla;
        private String material;
        private Integer stockAdicional = 0; // Stock específico de esta variante
        private String imagenUrl; // Imagen específica de la variante
    }

    /**
     * Información SEO (Search Engine Optimization)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeoInfo {
        private String slug; // URL amigable: "camisa-roja-algodon"
        private String metaTitle;
        private String metaDescription;
        private List<String> keywords = new ArrayList<>();
    }

    // ============================================
    // MÉTODOS DE UTILIDAD
    // ============================================

    /**
     * Agrega una imagen al producto
     */
    public void agregarImagen(String url, String alt, Boolean esPrincipal) {
        if (imagenes == null) {
            imagenes = new ArrayList<>();
        }
        
        // Si esta imagen es principal, desmarca las demás
        if (Boolean.TRUE.equals(esPrincipal)) {
            imagenes.forEach(img -> img.setEsPrincipal(false));
        }
        
        ImagenProducto imagen = new ImagenProducto(
            url, 
            alt, 
            esPrincipal, 
            imagenes.size()
        );
        imagenes.add(imagen);
    }

    /**
     * Obtiene la imagen principal
     */
    public ImagenProducto getImagenPrincipal() {
        if (imagenes == null || imagenes.isEmpty()) {
            return null;
        }
        return imagenes.stream()
                .filter(img -> Boolean.TRUE.equals(img.getEsPrincipal()))
                .findFirst()
                .orElse(imagenes.get(0)); // Si no hay principal, retorna la primera
    }

    /**
     * Agrega un atributo dinámico
     */
    public void agregarAtributo(String clave, String valor) {
        if (atributos == null) {
            atributos = new HashMap<>();
        }
        atributos.put(clave, valor);
    }

    /**
     * Agrega una variante
     */
    public void agregarVariante(Variante variante) {
        if (variantes == null) {
            variantes = new ArrayList<>();
        }
        variantes.add(variante);
    }

    /**
     * Busca una variante por SKU
     */
    public Variante buscarVariantePorSku(String sku) {
        if (variantes == null) {
            return null;
        }
        return variantes.stream()
                .filter(v -> sku.equals(v.getSku()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Verifica si el producto tiene variantes
     */
    public boolean tieneVariantes() {
        return variantes != null && !variantes.isEmpty();
    }

    /**
     * Obtiene todas las URLs de imágenes
     */
    public List<String> getUrlsImagenes() {
        if (imagenes == null) {
            return new ArrayList<>();
        }
        return imagenes.stream()
                .map(ImagenProducto::getUrl)
                .toList();
    }
}

/**
 * EJEMPLO DE DOCUMENTO EN MONGODB:
 * 
 * {
 *   "_id": "507f1f77bcf86cd799439011",
 *   "product_id": 123,
 *   "codigo": "CAM-ROJ-M-2024",
 *   "imagenes": [
 *     {
 *       "url": "https://cdn.ikaza.com/productos/camisa-roja-frente.jpg",
 *       "alt": "Camisa roja vista frontal",
 *       "es_principal": true,
 *       "orden": 0
 *     },
 *     {
 *       "url": "https://cdn.ikaza.com/productos/camisa-roja-espalda.jpg",
 *       "alt": "Camisa roja vista trasera",
 *       "es_principal": false,
 *       "orden": 1
 *     }
 *   ],
 *   "atributos": {
 *     "material": "100% Algodón",
 *     "tipo_cuello": "Cuello redondo",
 *     "manga": "Manga corta",
 *     "peso": "180g"
 *   },
 *   "especificaciones": [
 *     {
 *       "nombre": "Ancho de pecho",
 *       "valor": "52",
 *       "unidad": "cm"
 *     },
 *     {
 *       "nombre": "Largo total",
 *       "valor": "70",
 *       "unidad": "cm"
 *     }
 *   ],
 *   "variantes": [
 *     {
 *       "sku": "CAM-ROJ-S",
 *       "color": "Rojo",
 *       "talla": "S",
 *       "material": "Algodón",
 *       "stock_adicional": 15,
 *       "imagen_url": "https://cdn.ikaza.com/productos/camisa-roja-s.jpg"
 *     },
 *     {
 *       "sku": "CAM-ROJ-M",
 *       "color": "Rojo",
 *       "talla": "M",
 *       "material": "Algodón",
 *       "stock_adicional": 20,
 *       "imagen_url": "https://cdn.ikaza.com/productos/camisa-roja-m.jpg"
 *     }
 *   ],
 *   "seo": {
 *     "slug": "camisa-roja-algodon-manga-corta",
 *     "meta_title": "Camisa Roja de Algodón | Ikaza Imports",
 *     "meta_description": "Camisa roja de algodón 100%, cómoda y fresca. Perfecta para cualquier ocasión.",
 *     "keywords": ["camisa", "ropa", "algodón", "rojo", "casual"]
 *   },
 *   "marca": "Fashion Line",
 *   "modelo": "FL-2024-RED",
 *   "garantia": "30 días de garantía por defectos de fabricación",
 *   "instrucciones_uso": "Lavar a mano o máquina en agua fría. No usar cloro.",
 *   "fecha_creacion": "2024-01-15T10:30:00",
 *   "fecha_actualizacion": "2024-01-20T15:45:00"
 * }
 * 
 * ========================================
 * 
 * VENTAJAS DE MONGODB PARA ESTO:
 * 
 * 1. FLEXIBILIDAD:
 *    - No todos los productos tienen los mismos atributos
 *    - Una camisa tiene tallas y colores
 *    - Un libro tiene autor y páginas
 *    - Un electrodoméstico tiene voltaje y potencia
 *    - MongoDB permite que cada producto tenga campos diferentes
 * 
 * 2. ARRAYS Y OBJETOS ANIDADOS:
 *    - Múltiples imágenes sin necesidad de otra tabla
 *    - Variantes del producto en un solo documento
 *    - Especificaciones técnicas agrupadas
 * 
 * 3. ESCALABILIDAD:
 *    - Fácil agregar nuevos atributos sin migrar la BD
 *    - Cambios en el esquema sin afectar otros productos
 * 
 * 4. RENDIMIENTO:
 *    - Una sola consulta trae todo (imágenes, variantes, specs)
 *    - No necesita JOINs como en SQL
 */