// components/products-running-out/products-running-out.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';     // ← AGREGADO: Para [(ngModel)] y template-driven forms
import { Router } from '@angular/router';
import { Producto, PageResponse } from '@core/models/productos/producto-backend.model';
import { ProductoService } from '@core/services/productos/producto.service';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { CustomCarouselComponent } from '@shared/components/ui/carrusel/custom-carrousel';
import { Subscription, tap, finalize } from 'rxjs';

@Component({
  selector: 'app-productos-por-agotarse',
  templateUrl: './productos-por-agotarse.html',
  styleUrls: ['./productos-por-agotarse.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ]
})
export class ProductosPorAgotarseComponent implements OnInit {
  @Output() addToCartEvent = new EventEmitter<Producto>();

  allProducts: Producto[] = [];
  filtrarProductos: Producto[] = [];
  buscarPalabra: string = '';
  private productsSubscription?: Subscription

  // 🔑 Añadir estados de carga y error
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = 'No pudimos cargar los productos nuevos. Inténtalo más tarde.'; // Mensaje de error

  constructor(
    private productService: ProductoService,
    private cartService: CartService,
    private productUtils: ProductUtilsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true; // 🔑 Iniciar carga
    this.hasError = false; // Resetear error

    // Suscríbete al Observable para cargar los productos asíncronamente
    this.productsSubscription = this.productService.obtenerProductosPorAgotarse(12).pipe(
      tap((productos: Producto[]) => {
        // Aplica el filtro para productos de bajo stock (máximo 12)
        this.allProducts = productos;

        // Inicializa el array filtrado con los productos de bajo stock
        this.filtrarProductos = [...this.allProducts];
      }),
      // 🔑 Usar finalize para detener el estado de carga (siempre se ejecuta al completar o error)
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: () => {
        // La lógica de asignación ya está en tap()
      },
      error: (error) => {
        console.error('Error cargando productos por agotarse:', error);
        // Opcional: muestra un mensaje de error o toast
        this.allProducts = [];
        this.filtrarProductos = [];
      }
    });
  }

  gOnDestroy(): void {
    // Limpia la suscripción para evitar memory leaks
    this.productsSubscription?.unsubscribe();
  }
  onSearch() {
    // Usar método centralizado de filtrado (ahora sobre allProducts, que son solo los de bajo stock)
    if (this.buscarPalabra.trim()) {
      this.filtrarProductos = this.productUtils.filterProducts(this.allProducts, this.buscarPalabra);
    } else {
      // Si no hay término de búsqueda, muestra todos los de bajo stock
      this.filtrarProductos = [...this.allProducts];
    }
  }

  obtenerProductos(): Producto[] {
    return this.filtrarProductos;
  }

  agregarCarrito(product: Producto) {
    // Validar stock
    if (!this.productUtils.validateStock(product)) {
      return;
    }

    // Construir producto para carrito
    const productToAdd = this.productUtils.buildCartProduct(product);

    // Agregar al carrito
    this.cartService.addToCart(productToAdd);

    // Mostrar toast usando product-utils
    this.productUtils.showToast(product.nombreProducto);

    // Emitir evento
    this.addToCartEvent.emit(product);
  }

  onImageClick(product: Producto) {
    this.router.navigate(['/producto', product.idProducto]);
  }
}