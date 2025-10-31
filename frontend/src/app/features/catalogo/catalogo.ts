import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // 👈 Asegúrate de que esta importación exista

import { ProductoService } from '@core/services/productos/producto.service';
import { ProductoDetalle, Producto } from '@core/models/productos/producto-backend.model';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { ProductCardComponent } from '@shared/components/producto/product-card/product-card';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductCardComponent
  ],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.scss']
})
export class CatalogoComponent implements OnInit {

  allProducts: Producto[] = [];
  filteredProducts: Producto[] = [];
  selectedProduct?: Producto;

  categories: { name: string; value: string }[] = [];

  filteredCategory: string = 'todos';
  searchTerm: string = '';
  minPrice: number = 0;
  maxPrice: number = 3000;
  stockFilter: string = 'all';
  sortOption: string = 'featured';

  constructor(
    private productoService: ProductoService,
    private cartService: CartService,
    private productUtils: ProductUtilsService,
    private router: Router // 👈 Router inyectado correctamente
  ) { }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productoService.obtenerProductos(0, 50).subscribe({
      next: (response) => {
        this.allProducts = response.content;

        // generar categorías dinámicamente
        this.categories = [
          { name: 'Todos', value: 'todos' },
          ...Array.from(new Set(this.allProducts.map(p => p.nombreCategoria)))
            .map(cat => ({ name: cat, value: cat }))
        ];

        this.applyAllFilters();
      },
      error: (err) => console.error('Error cargando productos', err)
    });
  }

  filterByCategory(category: string) {
    this.filteredCategory = category;
    this.applyAllFilters();
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyAllFilters();
  }

  applyPriceFilter() { this.applyAllFilters(); }
  applyStockFilter() { this.applyAllFilters(); }
  applySort() { this.applyAllFilters(); }

  applyAllFilters() {
    let filtered = [...this.allProducts];

    if (this.searchTerm) {
      filtered = filtered.filter(p =>
        p.nombreProducto.toLowerCase().includes(this.searchTerm)
      );
    }

    if (this.filteredCategory !== 'todos') {
      filtered = filtered.filter(p => p.nombreCategoria === this.filteredCategory);
    }

    filtered = filtered.filter(p =>
      p.precio >= this.minPrice && p.precio <= this.maxPrice
    );

    if (this.stockFilter === 'available')
      filtered = filtered.filter(p => p.stock > 0);

    if (this.stockFilter === 'low')
      filtered = filtered.filter(p => p.stock <= 10);

    filtered = this.sortProducts(filtered);

    this.filteredProducts = filtered;
  }

  sortProducts(products: Producto[]): Producto[] {
    switch (this.sortOption) {
      case 'price-low':
        return products.sort((a, b) => a.precio - b.precio);
      case 'price-high':
        return products.sort((a, b) => b.precio - a.precio);
      case 'name':
        return products.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
      case 'rating':
        return products.sort((a, b) =>
          (b.calificacionPromedio || 0) - (a.calificacionPromedio || 0));
      default: return products;
    }
  }

  clearFilters() {
    this.filteredCategory = 'todos';
    this.searchTerm = '';
    this.minPrice = 0;
    this.maxPrice = 3000;
    this.stockFilter = 'all';
    this.sortOption = 'featured';
    this.applyAllFilters();
  }

  onQuickView(product: Producto) {
    // Mantener la lógica de QuickView para modals
    this.selectedProduct = product;
  }

 
onViewDetails(product: Producto) {
  console.log('Navegando a detalles del producto:', product.idProducto);
  this.router.navigate(['/producto', product.idProducto]);
}


  onAddToCart(product: Producto) {
    const cartProduct = this.productUtils.buildCartProduct(product);
    this.cartService.addToCart(cartProduct);
    this.showToast(`${product.nombreProducto} añadido al carrito!`);
  }

  showToast(message: string) {
    const toastElement = document.getElementById('successToast');
    const messageElement = document.getElementById('toastMessage');
    if (toastElement && messageElement) {
      messageElement.textContent = message;
      new (window as any).bootstrap.Toast(toastElement).show();
    }
  }

  getCategoryName(categoryValue: string): string {
    const category = this.categories.find(cat => cat.value === categoryValue);
    return category ? category.name : 'Categoría';
  }
}
