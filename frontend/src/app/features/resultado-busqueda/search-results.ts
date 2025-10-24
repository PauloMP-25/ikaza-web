// src/app/pages/search-results/search-results.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router'; // Para leer la URL
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { ProductoService } from '@core/services/productos/producto.service';
import { CartService } from '@core/services/carrito/cart';
import { Producto, PageResponse, ProductoDetalle } from '@core/models/productos/producto-backend.model';
import { ProductDetailModalComponent } from '@shared/components/product-detail-modal/product-detail-modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, ProductDetailModalComponent],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.scss']
})
export class SearchResultsComponent implements OnInit {

  allProducts: Producto[] = [];
  filteredProducts: Producto[] = [];
  searchTerm: string = '';
  private productsSubscription?: Subscription;
  public selectedProduct?: ProductoDetalle;


  constructor(
    private route: ActivatedRoute,
    private productUtils: ProductUtilsService,
    private productService: ProductoService, // Inyecta el servicio de productos
    private cartService: CartService
  ) { }

  ngOnInit(): void {
    this.productsSubscription = this.productService.obtenerProductos().subscribe({
      next: (response: PageResponse<Producto>) => {
        this.allProducts = response.content; // Extrae el array de productos
        // Ahora aplica el filtrado inicial basado en la URL (si hay searchTerm)
        this.applySearchFilter();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        // Opcional: muestra un toast o mensaje de error al usuario
        this.allProducts = []; // Evita errores downstream
        this.filteredProducts = [];
      }
    });

    // Escuchamos los cambios en los parámetros de la URL (por si el usuario busca de nuevo).
    this.route.queryParamMap.subscribe(params => {
      this.searchTerm = params.get('q') || ''; // Obtenemos el valor del parámetro 'q'.
      if (this.searchTerm) {
        this.filteredProducts = this.productUtils.filterProducts(this.allProducts, this.searchTerm);
      } else {
        this.filteredProducts = []; // O mostrar todos, como prefieras.
      }
    });
  }

  /**
   * Método helper para aplicar el filtro de búsqueda.
   * Se llama después de cargar productos o cuando cambia searchTerm.
   */
  private applySearchFilter(): void {
    if (this.searchTerm) {
      this.filteredProducts = this.productUtils.filterProducts(this.allProducts, this.searchTerm);
    } else {
      this.filteredProducts = this.allProducts; // Muestra todos si no hay búsqueda
    }
  }

  /**
  * Método para ver los detalles del producto en el modal.
  * Requiere cargar el ProductoDetalle completo.
  */
  public onViewDetails(product: Producto): void {
    //Llamar a un servicio para obtener el detalle completo
    this.productService.obtenerProductoPorId(product.idProducto).subscribe({
      next: (detalle: ProductoDetalle) => {
        this.selectedProduct = detalle; //Asignamos el objeto ProductoDetalle completo
        // this.isLoadingDetails = false;
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        // this.isLoadingDetails = false;
      }
    });
  }

  /**
  * Método para agregar un producto al carrito.
  * Mantenemos la lógica de producto base (asumiendo que no tiene variantes seleccionadas aquí).
  */
  public onAddToCart(product: Producto): void {
    console.log('SearchResults: Enviando a carrito', product.nombreProducto);

    // buildCartProduct ahora acepta la variante como opcional (undefined)
    const cartProduct = this.productUtils.buildCartProduct(product, undefined, 1);
    this.cartService.addToCart(cartProduct);

    this.productUtils.showToast(product.nombreProducto);
  }
}