// src/app/pages/search-results/search-results.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { ProductoService } from '@core/services/productos/producto.service';
import { CartService } from '@core/services/carrito/cart';
import { Producto, PageResponse, ProductoDetalle } from '@core/models/productos/producto-backend.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.scss']
})
export class SearchResultsComponent implements OnInit {

  allProducts: Producto[] = [];
  filteredProducts: Producto[] = [];
  searchTerm: string = '';
  minPrice: number = 0;
  maxPrice: number = 3000;

  private productsSubscription?: Subscription;
  public selectedProduct?: ProductoDetalle;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productUtils: ProductUtilsService,
    private productService: ProductoService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.productsSubscription = this.productService.obtenerProductos().subscribe({
      next: (response: PageResponse<Producto>) => {
        this.allProducts = response.content;
        this.applySearchFilter();
      },
      error: () => {
        this.allProducts = [];
        this.filteredProducts = [];
      }
    });

    this.route.queryParamMap.subscribe(params => {
      this.searchTerm = params.get('q') || '';
      this.applyAllFilters();
    });
  }

  private applySearchFilter(): void {
    if (this.searchTerm) {
      this.filteredProducts = this.productUtils.filterProducts(this.allProducts, this.searchTerm);
    } else {
      this.filteredProducts = this.allProducts;
    }
  }

  applyAllFilters(): void {
    this.applySearchFilter();
    this.filteredProducts = this.filteredProducts.filter(p =>
      p.precio >= this.minPrice && p.precio <= this.maxPrice
    );
  }

// src/app/pages/search-results/search-results.component.ts
setPriceRange(min: number, max: number) {
  // Si ya está activo, desactívalo (mostrar todos)
  if (this.minPrice === min && this.maxPrice === max) {
    this.minPrice = 0;
    this.maxPrice = 3000; // rango completo
  } else {
    this.minPrice = min;
    this.maxPrice = max;
  }
  this.applyAllFilters();
}


  onViewDetails(product: Producto): void {
    this.router.navigate(['/producto', product.idProducto]);
  }

  public onAddToCart(product: Producto): void {
    const cartProduct = this.productUtils.buildCartProduct(product, undefined, 1);
    this.cartService.addToCart(cartProduct);
    this.productUtils.showToast(product.nombreProducto);
  }
}
