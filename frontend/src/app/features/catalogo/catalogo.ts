import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductoService } from '@core/services/productos/producto.service';
import { CategoriaService } from '@core/services/categorias/categoria.service';
import { Producto, PageResponse } from '@core/models/productos/producto-backend.model';
import { ProductDetailModalComponent } from '@shared/components/product-detail-modal/product-detail-modal';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { CategorySectionComponent } from './category-section/category-section';
import { Subscription } from 'rxjs';
import { Categoria } from '@core/models/categoria/categoria.model';
import { ToastNotificationComponent } from "@shared/components/notificacion-carrito/toast-notification";

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    ProductDetailModalComponent,
    CategorySectionComponent,
    ToastNotificationComponent
],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.scss']
})
export class CatalogoComponent implements OnInit, OnDestroy {
  allProducts: Producto[] = [];
  filteredCategory: string = 'todos';
  categories: { name: string; value: string }[] = [{ name: 'Todos', value: 'todos' }];
  selectedProduct?: Producto;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  private productsSubscription?: Subscription;
  private categoriesSubscription?: Subscription;

  constructor(
    private productService: ProductoService,
    private categoriaService: CategoriaService,
    private cartService: CartService,
    private productUtils: ProductUtilsService,
    private router: Router
  ) { 
    console.log('🔧 CatalogoComponent: Constructor ejecutado');
  }

  ngOnInit() {
    console.log('🚀 CatalogoComponent: ngOnInit ejecutado');
    this.loadCategories();
    this.loadAllProducts();
  }

  /**
   * Cargar todas las categorías activas
   */
  loadCategories(): void {
    console.log('📂 Iniciando carga de categorías...');
    
    this.categoriesSubscription = this.categoriaService.obtenerCategoriasActivas().subscribe({
      next: (categorias: Categoria[]) => {
        console.log('✅ Categorías recibidas del backend:', categorias);
        console.log('📊 Cantidad de categorías:', categorias.length);
        
        // Mapear categorías del backend a formato del componente
        const categoriasMapeadas = categorias.map(cat => {
          console.log(`   - Categoría: ${cat.nombreCategoria} (ID: ${cat.idCategoria})`);
          return {
            name: cat.nombreCategoria,
            value: cat.nombreCategoria.toLowerCase()
          };
        });
        
        // Agregar "Todos" al inicio
        this.categories = [
          { name: 'Todos', value: 'todos' },
          ...categoriasMapeadas
        ];
        
        console.log('✅ Categorías finales procesadas:', this.categories);
      },
      error: (error) => {
        console.error('❌ Error al cargar categorías:', error);
        this.errorMessage = 'Error al cargar las categorías';
      }
    });
  }

  /**
   * Cargar todos los productos sin paginación para el catálogo
   */
  loadAllProducts(): void {
    console.log('📦 Iniciando carga de productos...');
    this.isLoading = true;
    this.errorMessage = '';

    // Obtener todos los productos (página 0, tamaño grande para obtener todo)
    this.productsSubscription = this.productService.obtenerProductos(
      0,
      1000, // Tamaño grande para obtener todos
      'nombreProducto',
      'ASC'
    ).subscribe({
      next: (response: PageResponse<Producto>) => {
        console.log('✅ Respuesta completa del backend:', response);
        console.log('📊 Total de productos en BD:', response.totalElements);
        console.log('📄 Productos en esta página:', response.content.length);
        console.log('📦 Productos recibidos:', response.content);
        
        this.allProducts = response.content;
        this.isLoading = false;
        
        // Log detallado de cada producto
        if (this.allProducts.length > 0) {
          console.log('🎯 Primeros 3 productos:');
          this.allProducts.slice(0, 3).forEach((p, index) => {
            console.log(`   ${index + 1}. ${p.nombreProducto} - Categoría: "${p.nombreCategoria}"`);
          });
        } else {
          console.warn('⚠️ No se recibieron productos del backend');
        }
        
        console.log('✅ allProducts actualizado. Total:', this.allProducts.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar productos:', error);
        console.error('❌ Detalles del error:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        this.errorMessage = 'Error al cargar los productos. Por favor, intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Filtrar productos por categoría
   */
  filterByCategory(category: string): void {
    console.log('🔍 Filtrando por categoría:', category);
    this.filteredCategory = category;
    
    // Log de productos filtrados
    if (category === 'todos') {
      console.log('📋 Mostrando todos los productos:', this.allProducts.length);
    } else {
      const filtered = this.allProducts.filter(p => 
        p.nombreCategoria.toLowerCase() === category.toLowerCase()
      );
      console.log(`📋 Productos en categoría "${category}":`, filtered.length);
      if (filtered.length > 0) {
        console.log('   Productos:', filtered.map(p => p.nombreProducto));
      }
    }
  }

  /**
   * Abrir modal de vista rápida (desde click en imagen)
   */
  onQuickView(product: Producto): void {
    console.log('👁️ Vista rápida (modal):', product.nombreProducto);
    this.selectedProduct = product;
  }

  /**
   * Ver detalles completos (navega a página dedicada)
   */
  onViewDetails(product: Producto): void {
    console.log('🔗 Navegando a detalles completos:', product.nombreProducto);
    this.router.navigate(['/productos', product.idProducto]);
  }

  /**
   * Cerrar modal
   */
  closeModal(): void {
    console.log('❌ Cerrando modal');
    this.selectedProduct = undefined;
  }

  /**
   * Agregar producto al carrito
   */
  onAddToCart(product: Producto): void {
    console.log('🛒 Agregando al carrito:', product.nombreProducto);
    const cartProduct = this.productUtils.buildCartProduct(product);
    this.cartService.addToCart(cartProduct);
    // Mostrar toast de confirmación
    this.productUtils.showToast(product.nombreProducto)
  }


  ngOnDestroy(): void {
    console.log('🧹 CatalogoComponent: Destruyendo componente y limpiando suscripciones');
    this.productsSubscription?.unsubscribe();
    this.categoriesSubscription?.unsubscribe();
  }
}