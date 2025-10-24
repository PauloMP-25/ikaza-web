import { Component, OnInit, OnDestroy } from '@angular/core';  // ← Agrega OnInit y OnDestroy
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';  // ← Para suscripciones
import { CartService } from '@core/services/carrito/cart';

@Component({
  selector: 'app-navbar-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-cart.html',
  styleUrls: ['./navbar-cart.scss']
})
export class NavbarCartComponent implements OnInit, OnDestroy {  // ← Implementa hooks
  cartItemCount = 0;  // ← Inicial 0; se actualizará dinámicamente
  private cartSubscription?: Subscription;  // ← Para limpiar suscripción

  constructor(private cartService: CartService) { }  // ← NUEVO: Inyecta el servicio

  ngOnInit() {
    // ← Suscribe al Observable del servicio (igual que en Header)
    this.cartSubscription = this.cartService.cartCount$.subscribe(count => {
      this.cartItemCount = count;  // ← Actualiza el badge automáticamente
      console.log('NavbarCart: Contador actualizado a', this.cartItemCount);  // ← Debug temporal
    });

    // ← Carga inicial (por si hay items en localStorage)
    this.cartItemCount = this.cartService.getCartCount();
  }

  ngOnDestroy() {
    // ← Limpia suscripción (buena práctica)
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}

