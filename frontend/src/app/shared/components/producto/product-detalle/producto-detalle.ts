// src/app/components/productos/producto-detalle/producto-detalle.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // [cite: 2]
import { ProductoService } from '@core/services/productos/producto.service';
import { Producto, ProductoDetalle, PageResponse, Variante } from '@core/models/productos/producto-backend.model';
import { ProductGalleryComponent } from './product-gallery/product-gallery';
import { ProductInfoComponent } from './product-info/product-info';
import { ProductReviewsComponent, Review } from './product-reviews/product-reviews';
import { ProductCardComponent } from '../product-card/product-card';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProductGalleryComponent,
    ProductInfoComponent,
    ProductReviewsComponent,
    ProductCardComponent],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss'
})
export class ProductoDetalleComponent implements OnInit {
  private productoService = inject(ProductoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(CartService);
  private productUtilsService = inject(ProductUtilsService);

  producto: ProductoDetalle | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  reviews: Review[] = [];
  averageRating: number = 0;
  similarProducts: Producto[] = [];

  // Control de imágenes: Se usará para enviar a ProductGallery
  imagenPrincipalUrl: string = 'assets/images/no-image.png';

  // Control de variantes y cantidad (La lógica de cantidad se simplificará y moverá a ProductInfo)
  varianteSeleccionada: Variante | undefined = undefined;

  // Propiedades inferidas necesarias para ProductInfo y Reviews
  reviewCount: number = 0; // Usado en ProductInfo

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarProducto(+id);
    }
  }

  /**
   * Cargar detalles del producto y datos relacionados
   */
  cargarProducto(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productoService.obtenerDetalleProducto(id).subscribe({
      next: (producto) => {
        this.producto = producto;

        // 1. Configurar imagen principal para ProductGallery (Lógica actual)
        if (producto.imagenes && producto.imagenes.length > 0) {
          const imagenPrincipal = producto.imagenes.find(img => img.esPrincipal);
          this.imagenPrincipalUrl = imagenPrincipal?.url || producto.imagenes[0].url;
        } else if (producto.imagenPrincipal) {
          this.imagenPrincipalUrl = producto.imagenPrincipal;
        }
        // Nota: La imagen principal puede ser ajustada por el subcomponente ProductGallery.

        // 2. Cargar Reseñas (Simulación o servicio real)
        this.loadReviews(id);

        // 3. Cargar Productos Similares: ¡USAR ID de CATEGORÍA!
        // El modelo ProductoDetalle tiene idCategoria (number).
        if (producto.idCategoria) {
          this.loadSimilarProducts(producto.idCategoria, producto.idProducto);
        } else {
          console.warn('Producto sin ID de Categoría, no se cargarán productos similares.');
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando producto:', error);
        this.errorMessage = 'No se pudo cargar el producto. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Carga las reseñas del producto (MOCK - Reemplazar por servicio real)
   * La lógica de cálculo de promedio y conteo ahora se hace aquí o en el subcomponente.
   */
  loadReviews(productId: number): void {
    // ESTO DEBE SER REEMPLAZADO POR UN SERVICIO REAL
    this.reviews = this.generateMockReviews(productId);
    this.calculateAverageRating();
    this.reviewCount = this.reviews.length;
  }

  /**
   * Genera reseñas simuladas (MOCK)
   */
  private generateMockReviews(productId: number): Review[] {
    // Usamos la misma simulación de las líneas
    const mockReviews: Review[] = [
      { id: 1, userName: 'María García', rating: 5, comment: 'Excelente producto, justo lo que esperaba. La calidad es muy buena y llegó rápido.', date: new Date(2025, 8, 15) },
      { id: 2, userName: 'Juan Pérez', rating: 4, comment: 'Muy buen producto, aunque el envío tardó un poco más de lo esperado. En general, satisfecho.', date: new Date(2025, 8, 10) },
      { id: 3, userName: 'Ana Rodríguez', rating: 5, comment: '¡Me encantó! Totalmente recomendado. La atención al cliente también fue excelente.', date: new Date(2025, 8, 5) },
      { id: 4, userName: 'Carlos López', rating: 3, comment: 'Está bien, cumple con lo básico. Esperaba un poco más por el precio.', date: new Date(2025, 7, 28) },
      { id: 5, userName: 'Lucía Martínez', rating: 5, comment: 'Perfecto, exactamente como en la descripción. Muy contenta con la compra.', date: new Date(2025, 7, 20) },
      { id: 6, userName: 'Diego Fernández', rating: 4, comment: 'Buena relación calidad-precio. Lo volvería a comprar.', date: new Date(2025, 7, 15) }
    ];
    return mockReviews.slice(0, Math.max(3, productId % 7));
  }

  /**
   * Calcula el promedio de calificaciones
   */
  private calculateAverageRating(): void {
    if (this.reviews.length === 0) {
      this.averageRating = 0;
      return;
    }
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
  }

  /**
  * Carga productos similares usando el ProductoService.obtenerProductosPorCategoria.
  * Obtiene la respuesta paginada y extrae el contenido.
  */
  loadSimilarProducts(idCategoria: number, currentProductId: number): void {
    const SIZE_LIMIT = 4; // Queremos solo 4 tarjetas similares

    // Llamamos al servicio con el ID de la categoría del producto actual
    this.productoService.obtenerProductosPorCategoria(idCategoria, 0, 10).subscribe({
      next: (pageResponse: PageResponse<Producto>) => {
        // La respuesta es paginada. Extraemos el array 'content'.
        const allProducts = pageResponse.content || [];

        // 1. Filtrar el producto actual
        const filteredProducts = allProducts.filter(p => p.idProducto !== currentProductId);

        // 2. Limitar la cantidad de productos
        this.similarProducts = filteredProducts.slice(0, SIZE_LIMIT);

        console.log(`Productos similares cargados (ID Cat: ${idCategoria}):`, this.similarProducts.length);
      },
      error: (error) => {
        console.error('Error cargando productos similares:', error);
        this.similarProducts = []; // Vaciar en caso de error
      }
    });
  }

  /**
  * Maneja el evento de agregar al carrito desde el subcomponente ProductInfo
  */

  onAgregarAlCarrito(cantidad: number): void {
    if (!this.producto) {
      this.productUtilsService.showErrorMessage('Error: No se pudo agregar el producto. Información faltante.');
      return;
    }
    // 1. Validar stock (con variante, si está seleccionada)
    if (!this.productUtilsService.validateStock(this.producto, this.varianteSeleccionada)) {
      return;
    }
    // 2. Construye el CartItem
    const productToAdd = this.productUtilsService.buildCartProduct(
      this.producto,
      this.varianteSeleccionada,
      cantidad
    );

    // 3. Agrega al carrito
    this.cartService.addToCart(productToAdd);

    // 4. Muestra toast centralizado (pasando la variante si existe)
    this.productUtilsService.showToast(
      this.producto.nombreProducto,
      this.varianteSeleccionada
    );
    console.log('✅ Producto y variante añadidos al carrito.', {
      producto: this.producto.nombreProducto,
      variante: this.varianteSeleccionada,
      cantidad: cantidad
    });
  }

  /**
     * Agrega un producto similar al carrito (recibe el objeto Producto completo).
     */
  onAgregarProductoSimilarAlCarrito(productoSimilar: any): void {
    if (!this.productUtilsService.validateStock(productoSimilar)) {
      return;
    }

    const productToAdd = this.productUtilsService.buildCartProduct(productoSimilar);    
    this.cartService.addToCart(productToAdd);

    this.productUtilsService.showToast(productoSimilar.nombreProducto);

    console.log('✅ Producto similar añadido al carrito:', productoSimilar.nombreProducto);
  }

  /**
   * Navega a los detalles de otro producto (recibe el objeto Producto completo)
   */
  onPresionarImagen(ProductoDetalle: any): void {
    // Accedemos al ID del producto emitido para navegar
    if (ProductoDetalle && ProductoDetalle.id) {
      this.router.navigate(['/producto', ProductoDetalle.id]).then(() => {
        // Recargar la página para cargar los nuevos datos del ID
        window.location.reload();
      });
    } else {
      console.error('El producto similar no tiene ID para navegar.');
    }
  }

  /**
   * Lógica para obtener el array de URLs de imágenes
   */
  getProductImages(): string[] {
    const urls: string[] = [];
    if (this.producto?.imagenPrincipal) {
      urls.push(this.producto.imagenPrincipal);
    }
    // Agregar URLs de las imágenes adicionales
    if (this.producto?.imagenes && this.producto.imagenes.length > 0) {
      this.producto.imagenes.forEach(img => {
        if (!urls.includes(img.url)) {
          urls.push(img.url);
        }
      });
    }
    return urls.length > 0 ? urls : ['assets/images/no-image.png'];
  }

  /**
   * Volver a la lista
   */
  volverALista(): void {
    this.router.navigate(['/productos']);
  }
}