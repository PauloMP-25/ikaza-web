import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from '@core/models/productos/producto-backend.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss']
})
export class ProductCardComponent {
  @Input() product!: Producto;
  
  // Eventos separados para diferentes acciones
  @Output() quickView = new EventEmitter<Producto>();        // Click en imagen → Modal
  @Output() viewDetails = new EventEmitter<Producto>();      // Botón "Ver Detalles" → Página
  @Output() addToCart = new EventEmitter<Producto>();

  /**
   * Vista rápida (modal) - Click en imagen
   */
  onQuickView(): void {
    console.log('🖼️ ProductCard: Click en imagen ->', this.product.nombreProducto);
    this.quickView.emit(this.product);
  }

  /**
   * Ver detalles completos - Botón "Ver Detalles"
   */
  onViewDetails(): void {
    console.log('👁️ ProductCard: Click en Ver Detalles ->', this.product.nombreProducto);
    this.viewDetails.emit(this.product);
  }

  /**
   * Agregar al carrito
   */
  onAddToCart(): void {
    if (this.product.disponible && this.product.stock > 0) {
      console.log('🛒 ProductCard: Añadiendo al carrito ->', this.product.nombreProducto);
      this.addToCart.emit(this.product);
    }
  }

  /**
   * Formatear precio
   */
  formatearPrecio(precio: number): string {
    return `S/ ${precio.toFixed(2)}`;
  }

  /**
   * Obtener estado del stock
   */
  obtenerEstadoStock(stock: number): { clase: string; texto: string } {
    if (stock === 0) {
      return { clase: 'badge bg-danger', texto: 'Agotado' };
    } else if (stock < 10) {
      return { clase: 'badge bg-warning text-dark', texto: `Stock: ${stock}` };
    } else {
      return { clase: 'badge bg-success', texto: `Stock: ${stock}` };
    }
  }

  /**
   * Obtener clase de estrella según posición y rating
   */
  getStarClass(position: number): string {
    const rating = this.product.calificacionPromedio || 0;

    if (rating >= position) {
      return 'bi-star-fill';
    } else if (rating >= position - 0.5) {
      return 'bi-star-half';
    } else {
      return 'bi-star';
    }
  }
}