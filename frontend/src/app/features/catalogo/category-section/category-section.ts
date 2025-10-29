import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '@shared/components/producto/product-card/product-card';
import { FilterByCategoryPipe } from '@shared/pipes/filter-by-category.pipe';
import { Producto } from '@core/models/productos/producto-backend.model';

@Component({
  selector: 'app-category-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, FilterByCategoryPipe],
  templateUrl: './category-section.html',
  styleUrls: ['./category-section.scss']
})
export class CategorySectionComponent {
  @Input() category!: { name: string; value: string };
  @Input() allProducts!: Producto[];
  @Input() filteredCategory!: string;
  @Input() isAllVisible = false;
  @Output() onViewDetails = new EventEmitter<Producto>();
  @Output() onAddToCart = new EventEmitter<Producto>();

  // Normalizar textos (quitar acentos y pasar a minúsculas)
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Filtrar productos por categoría correcta
  getFilteredProducts(): Producto[] {
    const categoryNorm = this.normalize(this.category.value);
    return this.allProducts.filter(
      p => this.normalize(p.nombreCategoria || '') === categoryNorm
    );
  }

  shouldShowCategory(): boolean {
    if (this.isAllVisible) return false;
    return this.filteredCategory === this.category.value &&
           this.getFilteredProducts().length > 0;
  }

  shouldShowHeader(): boolean {
    return !this.isAllVisible &&
           this.filteredCategory === this.category.value;
  }

  get showSection(): boolean {
  return !this.isAllVisible && this.filteredCategory === this.category.value;
  }


  // Iconos por coincidencia parcial
  getCategoryIcon(): string {
    const categoryNorm = this.normalize(this.category.value);

    const iconMap: { key: string; icon: string }[] = [
      { key: 'electron', icon: 'bi-laptop' },
      { key: 'tecnol', icon: 'bi-laptop' },
      { key: 'ropa', icon: 'bi-bag' },
      { key: 'moda', icon: 'bi-bag' },
      { key: 'hogar', icon: 'bi-house-door' },
      { key: 'cocina', icon: 'bi-house-door' },
      { key: 'deport', icon: 'bi-trophy' },
      { key: 'libro', icon: 'bi-book' },
      { key: 'juguet', icon: 'bi-puzzle' },
      { key: 'regalo', icon: 'bi-puzzle' },
      { key: 'cuidado', icon: 'bi-hearts' },
      { key: 'herramient', icon: 'bi-tools' },
      { key: 'costura', icon: 'bi-scissors' },
      { key: 'accesor', icon: 'bi-watch' },
      { key: 'variedad', icon: 'bi-grid' },
    ];

    const found = iconMap.find(i => categoryNorm.includes(i.key));
    return found ? found.icon : 'bi-grid';
  }

  viewDetails(product: Producto): void {
    this.onViewDetails.emit(product);
  }

  addToCart(product: Producto): void {
    this.onAddToCart.emit(product);
  }
}
