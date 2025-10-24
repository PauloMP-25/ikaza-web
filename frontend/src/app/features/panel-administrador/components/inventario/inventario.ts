import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
//import { ProductoService } from '../../../../services/servicio-admin-productos/servicio-producto';
import { ProductoService } from '@core/services/productos/producto.service';
import { InventarioService } from '@core/services/inventario/inventario.service.ts';
import { ProductoInventario, InventarioResponse } from '@core/models/inventario/inventario.model';
import { InventarioModal } from './inventario-modal/inventario-modal';

declare var bootstrap: any;

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    InventarioModal
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.scss']
})
export class Inventario implements OnInit {

  private productoService = inject(ProductoService);
  private inventarioService = inject(InventarioService);

  productos: ProductoInventario[] = [];
  // Producto seleccionado para modificar stock o gestionar inventario.
  productoInventario: ProductoInventario | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.cargarProductos();
  }

  /**
   * Carga inicial del inventario de productos.
   * Usa la API Mock (productoService.getProductos) para obtener todos los registros.
   * BACKEND: Esta llamada deberá conectarse a la API real del inventario (GET /productos).
   */
  /**
  * Carga el inventario desde el backend
  * Usa el endpoint de productos con inventario
  */
  cargarProductos() {
    this.isLoading = true;
    this.errorMessage = null;

    // Opción 1: Obtener productos y su inventario directamente
    this.productoService.obtenerProductos(0, 1000).subscribe({
      next: (response) => {
        this.productos = response.content.map(p => ({
          idProducto: p.idProducto,
          nombreProducto: p.nombreProducto,
          sku: p.codigo || 'N/A',
          stock: p.stock,
          precio: p.precio
        }));
        this.isLoading = false;
        console.log('Inventario cargado:', this.productos);
      },
      error: (err) => {
        console.error('Error al cargar inventario:', err);
        this.errorMessage = 'Error al cargar el inventario. Intente nuevamente.';
        this.isLoading = false;
      }
    });

    // Opción 2: Si tienes un endpoint específico de inventario
    /*
    this.inventarioService.obtenerInventarios().subscribe({
        next: (inventarios: InventarioResponse[]) => {
            this.productos = inventarios.map(inv => ({
                idProducto: inv.idProducto,
                nombreProducto: inv.nombreProducto,
                sku: 'N/A', // Si no viene en el response
                stock: inv.stockDisponible,
                precio: 0 // Si no viene en el response
            }));
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Error al cargar inventario:', err);
            this.errorMessage = 'Error al cargar el inventario.';
            this.isLoading = false;
        }
    });
    */
  }

  /**
  * Recarga un producto específico después de actualizar el stock
  */
  recargarInventario(nuevoStock: number) {
    const index = this.productos.findIndex(p => p.idProducto === this.productoInventario?.idProducto);
    if (index !== -1) {
      this.productos[index].stock = nuevoStock;
    }

    this.cerrarModal('gestionarStockModal');
    this.productoInventario = null;
  }

  limpiarFoco() {
    (document.activeElement as HTMLElement)?.blur();
  }

  /**
   * Abre el modal de gestión de stock.
   * 1. Asigna el producto seleccionado para que Angular renderice el componente hijo.
   * 2. Usa Bootstrap para mostrar el modal una vez renderizado.
   */
  abrirModalGestion(producto: ProductoInventario) {
    this.productoInventario = { ...producto };

    setTimeout(() => {
      const modalElement = document.getElementById('gestionarStockModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }, 0);
  }

  /**
   * Cierra manualmente un modal Bootstrap por su ID.
   * También limpia el producto seleccionado para liberar recursos.
   */
  cerrarModal(modalId: string) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      this.limpiarFoco();
      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modal.hide();
      this.productoInventario = null;
    }
  }

  /**
   * Obtiene la clase del badge según el stock
   */
  getStockBadgeClass(stock: number): string {
    if (stock === 0) return 'bg-danger text-white';
    if (stock <= 5) return 'bg-warning text-dark';
    if (stock <= 10) return 'bg-info text-white';
    return 'bg-success text-white';
  }
}
