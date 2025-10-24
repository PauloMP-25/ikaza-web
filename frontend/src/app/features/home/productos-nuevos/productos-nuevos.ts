// components/new-products/new-products.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto, PageResponse } from '@core/models/productos/producto-backend.model';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { CustomCarouselComponent } from '@shared/components/ui/carrusel/custom-carrousel';
import { ProductoService } from '@core/services/productos/producto.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-productos-nuevos',
  templateUrl: './productos-nuevos.html',
  styleUrls: ['./productos-nuevos.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomCarouselComponent
  ]
})
export class ProductosNuevosComponent implements OnInit {
  @Output() addToCartEvent = new EventEmitter<Producto>();

  allProducts: Producto[] = [];
  filtrarProductos: Producto[] = [];
  buscarPalabra: string = '';
  private productsSubscription?: Subscription;

  constructor(
    private cartService: CartService,
    private productService: ProductoService,
    private productUtils: ProductUtilsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    // Suscríbete al Observable para cargar los productos asíncronamente
    this.productsSubscription = this.productService.obtenerProductosMasRecientes(12).subscribe({
      next: (productos: Producto[]) => {
        // Enriquecimiento: Convierte fechaCreacion (string) a dateAdded (Date) para usar en filtros y cálculos
        const enrichedProducts = productos.map((p: Producto) => ({
          ...p,
          dateAdded: new Date(p.fechaCreacion) // Usa fechaCreacion real del backend
        })) as Producto[];
        // Aplica el filtro para productos nuevos (máximo 12, basado en dateAdded reciente)
        this.allProducts = productos;
        // Inicializa el array filtrado con los productos nuevos
        this.filtrarProductos = [...this.allProducts];
      },
      error: (error) => {
        console.error('Error cargando productos nuevos:', error);
        this.allProducts = [];
        this.filtrarProductos = [];
      }
    });
  }

  ngOnDestroy(): void {
    // Limpia la suscripción para evitar memory leaks
    this.productsSubscription?.unsubscribe();
  }

  onSearch() {
    if (this.buscarPalabra.trim()) {
      this.filtrarProductos = this.productUtils.filterProducts(this.allProducts, this.buscarPalabra);
    } else {
      // Si no hay término de búsqueda, muestra todos los nuevos
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

  // Usar método centralizado para calcular días
  calcularDiasDesdeHoy(dateAdded?: Date): string {
    return this.productUtils.calculateDaysSince(dateAdded);
  }
}