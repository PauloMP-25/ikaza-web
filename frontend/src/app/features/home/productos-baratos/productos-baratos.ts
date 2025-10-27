// components/cheapest-products/cheapest-products.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '@core/services/carrito/cart';
import { Producto, PageResponse } from '@core/models/productos/producto-backend.model';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { CustomCarouselComponent } from '@shared/components/ui/carrusel/custom-carrousel';
import { ProductoService } from '@core/services/productos/producto.service';
import { tap, finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-productos-baratos',
  templateUrl: './productos-baratos.html',
  styleUrls: ['./productos-baratos.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomCarouselComponent,
  ]
})
export class ProductosBaratosComponent implements OnInit {
  @Output() addToCartEvent = new EventEmitter<Producto>();

  allProducts: Producto[] = [];
  filtrarProductos: Producto[] = [];
  buscarPalabra: string = '';
  private productsSubscription?: Subscription;

  // 🔑 Añadir estados de carga y error
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = 'No pudimos cargar los productos nuevos. Inténtalo más tarde.'; // Mensaje de error

  constructor(
    private cartService: CartService,
    private productUtils: ProductUtilsService,
    private productService: ProductoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true; // 🔑 Iniciar carga
    this.hasError = false; // Resetear error

    // Suscríbete al Observable para cargar los productos asíncronamente
    this.productsSubscription = this.productService.obtenerProductosMasBaratos(12).pipe(
      // 🔑 Usar tap para forzar a que la data tenga un valor antes de la lógica
      tap((productos: Producto[]) => {
        this.allProducts = productos;

        // Inicializa el array filtrado con los productos baratos
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
        console.error('Error cargando productos baratos:', error);
        // Opcional: muestra un mensaje de error o toast
        this.allProducts = [];
        this.filtrarProductos = [];
      }
    });
  }

  ngOnDestroy(): void {
    // Limpia la suscripción para evitar memory leaks
    this.productsSubscription?.unsubscribe();
  }
  onSearch(): void {
    // Usar método centralizado de filtrado (ahora sobre allProducts, que son solo los baratos)
    if (this.buscarPalabra.trim()) {
      this.filtrarProductos = this.productUtils.filterProducts(this.allProducts, this.buscarPalabra);
    } else {
      // Si no hay término de búsqueda, muestra todos los baratos
      this.filtrarProductos = [...this.allProducts];
    }
  }

  obtenerProductos(): Producto[] {
    return this.filtrarProductos;
  }

  agregarCarrito(product: Producto): void {
    // Validar stock usando product-utils
    if (!this.productUtils.validateStock(product)) {
      return;
    }

    // Construir producto para carrito (simple, sin variantes)
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