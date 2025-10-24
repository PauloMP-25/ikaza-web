import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductUtilsService } from '../productos/product-utils.service';
import { CartItem } from '@core/models/carrito/cart-item';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();

  private cartTotalSubject = new BehaviorSubject<number>(0);
  public cartTotal$ = this.cartTotalSubject.asObservable();

  constructor(private productUtils: ProductUtilsService) {  // 👈 Inyectamos utilidades
    this.loadCart();
    this.updateCart();
  }

  // ========================================
  // AGREGAR PRODUCTO
  // ========================================
  addToCart(product: CartItem) {
    // 👇 Centralizamos validación en ProductUtilsService
    if (!this.productUtils.validateStock(product)) return;

    console.log('Servicio: Intentando agregar', product.nombreProducto,
      'Carrito actual:', this.cartItems.map(i => ({ name: i.nombreProducto, qty: i.qty })));

    // Busca duplicados (mismo id + color + size)
    let existingItem = this.cartItems.find(item =>
      item.idProducto === product.idProducto &&
      item.color === product.color &&
      item.size === product.size
    );

    if (existingItem) {
      const oldQty = existingItem.qty;
      existingItem.qty += product.qty || 1;
      console.log(`Servicio: Duplicado encontrado. Qty de ${oldQty} → ${existingItem.qty} para ${product.nombreProducto}`);
    } else {
      const newItem: CartItem = { ...product, qty: product.qty || 1 };
      this.cartItems.push(newItem);
      console.log(`Servicio: Nuevo item agregado: ${product.nombreProducto} (Color: ${product.color}, 
        Talla: ${product.size}) qty=${newItem.qty}`);
    }

    this.saveCart();
    this.updateCart();
    console.log('Servicio: Post-agregado. Carrito:', this.cartItems.map(i => ({ name: i.nombreProducto, qty: i.qty })));
  }

  // ========================================
  // LOCALSTORAGE (CARGAR)
  // ========================================
  private loadCart() {
    const saved = localStorage.getItem('cartItems');
    if (saved) {
      let loadedItems: CartItem[] = JSON.parse(saved).map((item: any) => ({
        ...item,
        id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
        qty: item.qty || 1
      }));

      // Fusiona duplicados antiguos (por id + color + size)
      const uniqueItems: CartItem[] = [];
      const map = new Map<string, CartItem>();
      loadedItems.forEach(item => {
        const key = `${item.idProducto}-${item.color || ''}-${item.size || ''}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.qty += item.qty;
          console.log(`Servicio: Merge qty en load para ${item.nombreProducto}: +${item.qty} = ${existing.qty}`);
        } else {
          map.set(key, item);
        }
      });
      uniqueItems.push(...map.values());

      this.cartItems = uniqueItems;
      console.log('Servicio: Cargado unique de localStorage', this.cartItems);
    }
  }

  // ========================================
  // OPERACIONES BÁSICAS
  // ========================================
  removeFromCart(productId: number, color?: string, size?: string) {
    this.cartItems = this.cartItems.filter(item =>
      !(item.idProducto === productId && item.color === color && item.size === size)
    );
    this.saveCart();
    this.updateCart();
  }

  clearCart() {
    this.cartItems = [];
    this.saveCart();
    this.updateCart();
  }

  getCartItems(): CartItem[] {
    return [...this.cartItems];  // copia inmutable
  }

  getCartCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.qty, 0);
  }

  getCartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  }

  // ========================================
  // ACTUALIZACIONES
  // ========================================
  private updateCart() {
    const totalCount = this.getCartCount();
    const totalPrice = this.getCartTotal();
    this.cartCountSubject.next(totalCount);
    this.cartTotalSubject.next(totalPrice);
    console.log(`Servicio: Emite count ${totalCount} y total $${totalPrice.toFixed(2)}`);
  }

  private saveCart() {
    localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
  }
}
