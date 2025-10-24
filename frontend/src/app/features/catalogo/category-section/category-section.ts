import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  
  // Eventos separados para diferentes acciones
  @Output() onQuickView = new EventEmitter<Producto>();      // Click en imagen → Modal
  @Output() onViewDetails = new EventEmitter<Producto>();    // Botón "Ver Detalles" → Página
  @Output() onAddToCart = new EventEmitter<Producto>();

  // Cache de productos filtrados
  filteredProducts: Producto[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Recalcular productos filtrados cuando cambie algo relevante
    if (changes['allProducts'] || changes['category'] || changes['filteredCategory'] || changes['isAllVisible']) {
      console.log(`🔄 CategorySection [${this.category?.name}]: Cambios detectados`);
      console.log(`   - Total productos recibidos: ${this.allProducts?.length || 0}`);
      console.log(`   - Categoría value: "${this.category?.value}"`);
      console.log(`   - Categoría filtrada global: "${this.filteredCategory}"`);
      console.log(`   - Mostrar todo: ${this.isAllVisible}`);
      
      this.filteredProducts = this.getFilteredProducts();
      
      console.log(`   - Productos filtrados: ${this.filteredProducts.length}`);
      
      if (this.filteredProducts.length > 0) {
        console.log(`   ✅ Productos en esta categoría:`, this.filteredProducts.map(p => p.nombreProducto));
      } else {
        console.log(`   ⚠️ No hay productos para esta categoría`);
        // Debug adicional
        if (this.allProducts?.length > 0) {
          console.log(`   🔍 Categorías disponibles en productos:`, 
            [...new Set(this.allProducts.map(p => p.nombreCategoria))]);
        }
      }
    }
  }

  /**
   * Determina si mostrar la sección
   */
  get showSection(): boolean {
    const shouldShow = this.isAllVisible || this.filteredCategory === this.category.value;
    console.log(`👁️ CategorySection [${this.category?.name}]: showSection = ${shouldShow} (isAllVisible: ${this.isAllVisible}, filteredCategory: "${this.filteredCategory}", category.value: "${this.category?.value}")`);
    return shouldShow;
  }

  /**
   * Obtiene el icono según la categoría
   */
  getCategoryIcon(): string {
    const iconMap: { [key: string]: string } = {
      'electronica': 'bi-laptop',
      'electronicos': 'bi-laptop',
      'electrónica': 'bi-laptop',
      'electrónicos': 'bi-laptop',
      'ropa': 'bi-bag',
      'hogar': 'bi-house-door',
      'deportes': 'bi-trophy',
      'libros': 'bi-book',
      'juguetes': 'bi-puzzle',
      'alimentos': 'bi-basket',
      'belleza': 'bi-hearts',
      'default': 'bi-grid'
    };

    const categoryLower = this.normalizeString(this.category.value);
    return iconMap[categoryLower] || iconMap['default'];
  }

  /**
   * Normaliza un string (minúsculas, sin acentos, sin espacios extra)
   */
  private normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /**
   * Obtiene productos filtrados por categoría
   */
  getFilteredProducts(): Producto[] {
    if (!this.allProducts || this.allProducts.length === 0) {
      console.log(`⚠️ CategorySection [${this.category?.name}]: allProducts vacío o undefined`);
      return [];
    }

    const categoryNormalized = this.normalizeString(this.category.value);
    console.log(`🔍 CategorySection [${this.category.name}]: Buscando productos con categoría normalizada: "${categoryNormalized}"`);
    console.log(`   📋 Categorías en productos:`, [...new Set(this.allProducts.map(p => `"${p.nombreCategoria}" → "${this.normalizeString(p.nombreCategoria)}"`))]);

    const filtered = this.allProducts.filter(p => {
      const productCategory = this.normalizeString(p.nombreCategoria || '');
      const match = productCategory === categoryNormalized;
      
      if (match) {
        console.log(`   ✅ Match: "${p.nombreProducto}" (categoría original: "${p.nombreCategoria}", normalizada: "${productCategory}")`);
      }
      
      return match;
    });

    console.log(`📊 CategorySection [${this.category.name}]: ${filtered.length} productos filtrados de ${this.allProducts.length} totales`);
    return filtered;
  }

  /**
   * Vista rápida (modal) - desde click en imagen
   */
  quickView(product: Producto): void {
    console.log(`🖼️ CategorySection: Emitiendo quickView (modal) para ${product.nombreProducto}`);
    this.onQuickView.emit(product);
  }

  /**
   * Ver detalles completos (página) - desde botón
   */
  viewDetails(product: Producto): void {
    console.log(`👁️ CategorySection: Emitiendo viewDetails (página) para ${product.nombreProducto}`);
    this.onViewDetails.emit(product);
  }

  /**
   * Agregar al carrito
   */
  addToCart(product: Producto): void {
    console.log(`🛒 CategorySection: Emitiendo addToCart para ${product.nombreProducto}`);
    this.onAddToCart.emit(product);
  }
}