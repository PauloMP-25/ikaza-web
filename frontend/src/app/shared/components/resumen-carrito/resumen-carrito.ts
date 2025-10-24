import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartItem } from '@core/models/carrito/cart-item';

@Component({
  selector: 'app-resumen-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, DecimalPipe],
  templateUrl: './resumen-carrito.html',
  styleUrls: ['./resumen-carrito.scss']
})
export class ResumenCarrito {
  // 1. Datos de entrada (Input)
  @Input() cartItems: CartItem[] = [];
  @Input() isAuthenticated: boolean = false;
  @Input() userHasCompleteData: boolean = false;
  @Input() total: number = 0;
  @Input() paymentButtonText: string = 'Ir al pago';
  @Input() paymentButtonIcon: string = 'bi-credit-card';
  @Input() missingRequirements: string[] = [];

  // 2. Eventos de salida (Output)
  @Output() checkoutClicked = new EventEmitter<void>();
  @Output() clearCartClicked = new EventEmitter<void>();
  @Output() removeItemClicked = new EventEmitter<number>(); // Emite el ID del producto

  // 3. Métodos para emitir eventos
  onCheckout() {
    this.checkoutClicked.emit();
  }

  onClearCart() {
    this.clearCartClicked.emit();
  }

  onRemoveItem(productId: number) {
    this.removeItemClicked.emit(productId);
  }
}