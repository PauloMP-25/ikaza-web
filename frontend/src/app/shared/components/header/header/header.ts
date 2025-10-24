import { Component, OnInit, OnDestroy } from '@angular/core';  // ← Agrega OnDestroy aquí
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';  // ← Import para manejar suscripciones (nuevo)
import { NavbarComponent } from '../navbar/navbar';
import { CartOffcanvasComponent } from '../menu-carrito/menu-carrito';
import { SidebarComponent } from '../sidebar-header/sidebar';
import { CartService } from '@core/services/carrito/cart';
import { ConfirmacionPagoModalComponent } from '@features/pagos/confirmacion-pago-modal/confirmacion-pago-modal';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NavbarComponent, CartOffcanvasComponent, SidebarComponent, ConfirmacionPagoModalComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  cartCount = 0;
  private cartSubscription?: Subscription;  // ← Variable privada para la suscripción (nuevo, para limpiar)

  constructor(private cartService: CartService) { }

  ngOnInit() {
    // ← Tu código original: Suscribe para updates reactivos (perfecto!)
    this.cartSubscription = this.cartService.cartCount$.subscribe(count => {
      this.cartCount = count;  // Actualiza badge automáticamente
      console.log('Header: Contador actualizado a', this.cartCount);  // ← Debug temporal (quita después)
    });

    // ← Opcional: Carga inicial (por si hay items guardados)
    this.cartCount = this.cartService.getCartCount();
  }

  ngOnDestroy() {
    // ← Limpia la suscripción (buena práctica para apps grandes)
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}
