// src/app/components/product-detail/product-info/product-info.component.ts
// src/app/components/product-detail/product-info/product-info.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core'; // [cite: 124]
import { CommonModule } from '@angular/common'; // [cite: 124]
import { FormsModule } from '@angular/forms';
import { ProductoDetalle } from '@core/models/productos/producto-backend.model'; // Importamos el modelo correcto
// Asumo que tienes el ProductCardComponent y otros imports si el template los requiere.
import { ProductCardComponent } from '../../product-card/product-card';
import { ToastNotificationComponent } from "@shared/components/notificacion-carrito/toast-notification";

@Component({
  selector: 'app-product-info',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastNotificationComponent],
  templateUrl: './product-info.html',
  styleUrl: './product-info.scss'
})
export class ProductInfoComponent {
  // Cambiamos el tipo de 'product' a ProductoDetalle
  @Input() product!: ProductoDetalle;
  @Input() averageRating: number = 0;
  @Input() reviewCount: number = 0;
  // El evento emite la cantidad al componente padre
  @Output() addToCart = new EventEmitter<number>();
  quantity: number = 1;
  varianteSeleccionada: any = null;
ngOnInit() {
  console.log('Product Data:', this.product);
  console.log('Stock Disponible:', this.product?.stockDisponible);
  console.log('Stock:', this.product?.stock);
  console.log('Disponible:', this.product?.disponible);
}
  // Lógica para incremento/decremento basada en el stock disponible del padre
  increaseQuantity() { // [cite: 127]
    const maxStock = this.product.stockDisponible || 0; // Usar stockDisponible
    if (this.quantity < maxStock) {
      this.quantity++;
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Se emitirá la cantidad al componente padre (ProductoDetalleComponent)
  onAddToCart(comprarAhora: boolean = false) {
    this.addToCart.emit(this.quantity);
    if (comprarAhora) {
      // Si es "Comprar Ahora", el padre se encargará de la navegación
      console.log('Navegando a carrito...');
    }
    this.quantity = 1;
  }

  // Métodos de utilidad del ProductDetalleComponent original

  /**
   * Formatear precio del padre
   */
  formatearPrecio(precio: number): string {
    return `S/ ${precio.toFixed(2)}`;
  }

  /**
   * Obtener badge de stock del padre
   */
  obtenerEstadoStock(): { clase: string; texto: string } {
    const stock = this.product.stockDisponible || 0;

    if (stock === 0) {
      return { clase: 'badge bg-danger', texto: 'Agotado' };
    } else if (stock < 10) {
      return { clase: 'badge bg-warning text-dark', texto: `Solo quedan ${stock}` };
    } else {
      return { clase: 'badge bg-success', texto: 'Disp' };
    }
  }

  /**
   * Verificar si puede agregar al carrito del padre
   */
  puedeAgregarAlCarrito(): boolean {
    return this.product?.disponible === true &&
      (this.product?.stockDisponible || 0) > 0;
  }

  /**
   * Seleccionar variante del padre
   */
  seleccionarVariante(variante: any): void {
    this.varianteSeleccionada = variante;
    // Nota: El cambio de imagen se manejaría si ProductInfo también recibiera el control de la imagen,
    // o si notificara al padre para que este lo haga en ProductGallery.
    // Por simplicidad, ProductInfo solo maneja la selección para el carrito.
  }

  /**
 * Mostrar toast de confirmación
 */
  private showToast(productName: string): void {
    const toastElement = document.getElementById('successToast');
    const messageElement = document.getElementById('toastMessage');

    if (toastElement && messageElement) {
      messageElement.textContent = `${productName} añadido al carrito!`;
      const toast = new (window as any).bootstrap.Toast(toastElement);
      toast.show();
    }
  }
}