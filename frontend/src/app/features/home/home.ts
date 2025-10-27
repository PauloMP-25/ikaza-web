import { Component, OnInit } from '@angular/core';
import { CartService } from '@core/services/carrito/cart';
import { ProductoMasVendidoComponent } from './producto-mas-vendido/producto-mas-vendido';
import { ProductosBaratosComponent } from './productos-baratos/productos-baratos';
import { ProductosNuevosComponent } from './productos-nuevos/productos-nuevos';
import { ProductosPorAgotarseComponent } from "./productos-por-agotarse/productos-por-agotarse";
import { SeccionComentariosComponent } from "./seccion-comentarios/seccion-comentarios";
import { CartOffcanvasComponent } from '@shared/components/header/menu-carrito/menu-carrito';
import { BannersPromocionalComponent } from '@shared/components/ui/promotional-banners/promotional-banners';
import { ConfirmacionPagoModalComponent } from '@features/pagos/confirmacion-pago-modal/confirmacion-pago-modal';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ProductoMasVendidoComponent, ProductosBaratosComponent,
    ProductosNuevosComponent, ProductosPorAgotarseComponent, SeccionComentariosComponent, BannersPromocionalComponent, CartOffcanvasComponent, ConfirmacionPagoModalComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent{
}
