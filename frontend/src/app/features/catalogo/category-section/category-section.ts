import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductCardComponent } from '@shared/components/producto/product-card/product-card';
import { Producto } from '@core/models/productos/producto-backend.model';

@Component({
  selector: 'app-category-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './category-section.html',
  styleUrls: ['./category-section.scss']
})
export class CategorySectionComponent implements OnChanges {
    @Input() category!: { name: string; value: string };
  @Input() allProducts!: Producto[];
  @Input() filteredCategory!: string;
  @Input() isAllVisible = false;
  
  @Output() onAddToCart = new EventEmitter<Producto>();

  filteredProducts: Producto[] = [];

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allProducts'] || changes['category'] || changes['filteredCategory'] || changes['isAllVisible']) {
      this.filteredProducts = this.getFilteredProducts();
    }
  }

  get showSection(): boolean {
    return this.isAllVisible || this.filteredCategory === this.category.value;
  }

  getCategoryIcon(): string {
    const iconMap: { [key: string]: string } = {
      'electronica': 'bi-laptop',
      'electronicos': 'bi-laptop',
      'ropa': 'bi-bag',
      'hogar': 'bi-house-door',
      'deportes': 'bi-trophy',
      'libros': 'bi-book',
      'juguetes': 'bi-puzzle',
      'alimentos': 'bi-basket',
      'belleza': 'bi-hearts',
      'utencilios': 'bi-cup-straw',
      'default': 'bi-grid'
    };

    const categoryLower = this.normalizeString(this.category.value);
    return iconMap[categoryLower] || iconMap['default'];
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  getFilteredProducts(): Producto[] {
    if (!this.allProducts || this.allProducts.length === 0) {
      return [];
    }

    const categoryNormalized = this.normalizeString(this.category.value);
    
    return this.allProducts.filter(p => {
      const productCategory = this.normalizeString(p.nombreCategoria || '');
      return productCategory === categoryNormalized;
    });
  }

  /**
   * ❌ YA NO SE USA - ProductCard navega directamente
   */
  // quickView, viewDetails eliminados

  /**
   * 🛒 Agregar al carrito
   */
  addToCart(product: Producto): void {
    console.log('🛒 CategorySection: Emitiendo addToCart para', product.nombreProducto);
    this.onAddToCart.emit(product);
  }
}