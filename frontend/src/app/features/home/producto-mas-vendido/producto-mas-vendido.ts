// components/producto-mas-vendido/producto-mas-vendido.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '@core/services/carrito/cart';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';
import { ProductoService } from '@core/services/productos/producto.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Interfaces necesarias del modelo global
import { ProductoDetalle, Variante } from '@core/models/productos/producto-backend.model';
import { Subscription } from 'rxjs';

// Interfaz enriquecida para el estado del componente (adaptada al nuevo modelo)
interface ProductoMasVendido extends ProductoDetalle {
  // pero el enfoque es usar los arrays de variantes y su stock.
  currentVariant?: Variante; // La variante seleccionada actualmente
  defaultImage: string;
}

@Component({
  selector: 'app-producto-mas-vendido',
  templateUrl: './producto-mas-vendido.html',
  styleUrls: ['./producto-mas-vendido.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
  
})
export class ProductoMasVendidoComponent implements OnInit, OnDestroy {

  product: ProductoMasVendido | null = null;
  reviews: Review[] = [];
  reviewForm!: FormGroup;
  averageRating = 0;

  // Usamos strings para almacenar la selección del usuario para el filtro de variante
  selectedColorValue: string | null = null;
  selectedSizeValue: string | null = null;

  currentImage: string = '';
  private productSubscription?: Subscription;
  private readonly PRODUCT_ID = 49;

  constructor(
    private cartService: CartService,
    private productUtils: ProductUtilsService,
    private productService: ProductoService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loadProduct();
    this.reviewForm = this.fb.group({
    name: ['', Validators.required],
    rating: [0, [Validators.required, Validators.min(1)]],
    comment: ['', [Validators.required, Validators.minLength(5)]],
    });

    this.loadReviews();
  }
  

  ngOnDestroy(): void {
    this.productSubscription?.unsubscribe();
  }

  private loadProduct(): void {
    this.productSubscription = this.productService.obtenerProductoMasVendido().subscribe({
      next: (prod: ProductoDetalle | null) => {
        if (!prod) {
          this.product = null;
          return;
        }

        this.product = this.enrichProduct(prod);
        this.currentImage = this.product.defaultImage;
        this.initializeSelections();
      },
      error: (error) => {
        console.error('Error cargando producto más vendido:', error);
      }
    });
  }

  /**
   * Enriquecimiento: Mapea ProductoDetalle para la UI.
   * La clave es calcular el defaultImage.
   */
  private enrichProduct(prod: ProductoDetalle): ProductoMasVendido {
    const defaultImage = prod.imagenPrincipal ||
      (prod.imagenes && prod.imagenes.length > 0 ? prod.imagenes.find(img => img.esPrincipal)?.url || prod.imagenes[0].url : '');

    return {
      ...(prod as ProductoMasVendido), // Mapeo de ProductoDetalle a ProductoMasVendido
      defaultImage: defaultImage || 'assets/images/default.png'
    };
  }

  /**
   * Obtiene la lista de colores únicos para el template (solo si hay variantes)
   */
  get uniqueColors(): string[] {
    // 🔑 Si this.product es null, retornamos un array vacío.
    if (!this.product) return [];
    if (!this.product.variantes || this.product.variantes.length === 0) return [];
    return [...new Set(this.product.variantes.map(v => v.color).filter(c => c && c.trim()))];
  }

  /**
   * Obtiene la lista de tallas únicas para el template (solo si hay variantes)
   */
  get uniqueSizes(): string[] {
    // 🔑 Si this.product es null, retornamos un array vacío.
    if (!this.product) return [];
    if (!this.product.variantes || this.product.variantes.length === 0) return [];
    return [...new Set(this.product.variantes.map(v => v.talla).filter(s => s && s.trim()))];
  }


  /**
   * Inicializa color y size seleccionados por defecto
   */
  private initializeSelections(): void {
    if (!this.product) return;
    // Si hay variantes, selecciona la primera opción disponible
    if (this.product.variantes && this.product.variantes.length > 0) {
      this.selectedColorValue = this.uniqueColors[0] || null;
      this.selectedSizeValue = this.uniqueSizes[0] || null;

      // Intentar cargar la imagen de la primera variante seleccionada
      const defaultVariant = this.findVariant(this.selectedColorValue, this.selectedSizeValue);
      if (defaultVariant) {
        this.product.currentVariant = defaultVariant;
        this.currentImage = defaultVariant.imagenUrl || this.product.defaultImage;
      }
    }
  }

  /**
   * Helper para buscar la variante en el array del producto
   */
  private findVariant(color: string | null, size: string | null): Variante | undefined {
    if (!this.product?.variantes) return undefined;

    // Busca la variante que coincida exactamente con la selección
    return this.product.variantes.find(v =>
      (color === null || v.color === color) &&
      (size === null || v.talla === size)
    );
  }

  onSeleccionarColor(color: string): void {
    this.selectedColorValue = color;
    this.updateVariantSelection();
  }

  onSeleccionarSize(size: string): void {
    this.selectedSizeValue = size;
    this.updateVariantSelection();
  }

  /**
   * Actualiza la variante seleccionada y la imagen al cambiar color o talla.
   */
  private updateVariantSelection(): void {
    if (!this.product) return;

    const variant = this.findVariant(this.selectedColorValue, this.selectedSizeValue);

    this.product.currentVariant = variant;

    // Actualizar imagen si la variante tiene una específica
    if (variant?.imagenUrl) {
      this.currentImage = variant.imagenUrl;
    } else {
      // Si no hay imagen de variante, usar la principal del producto
      this.currentImage = this.product.defaultImage;
    }
  }

  /**
   * Obtiene el color de fondo para la UI (Mapear a Hex)
   * *NOTA: Reemplaza o implementa esta lógica si no usas un mapa fijo.
   */
  public getColorHex(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      'rojo': '#ff0000',
      'azul': '#0000ff',
      'verde': '#00ff00',
      'negro': '#000000',
      'blanco': '#ffffff',
    };
    return colorMap[colorName.toLowerCase()] || '#cccccc';
  }

  agregarCarrito(): void {
    if (!this.product) { // 🔑 Comprobación de nulidad
      console.warn('Intento de agregar al carrito sin producto cargado.');
      return;
    }
    // 1. Determinar si se usa la variante actual o el producto base
    const variant = this.product.currentVariant;

    // 2. Validar stock (pasa el producto y la variante si existe)
    if (!this.productUtils.validateStock(this.product, variant)) {
      return;
    }

    // 3. Construye producto para carrito (pasa la variante si existe)
    const productToAdd = this.productUtils.buildCartProduct(
      this.product,
      variant
    );

    this.cartService.addToCart(productToAdd);

    // 4. Muestra toast
    this.productUtils.showToast(
      this.product.nombreProducto,
      variant
    );
  }

  // Método para navegar al detalle del producto
  onImageClick(): void {
    if (!this.product) return; // 🔑 Comprobación de nulidad

    this.router.navigate(['/producto', this.product.idProducto]);
    
  }
  // Cargar reseñas (simulado )
  loadReviews(): void {
  // Simulación (luego conectaremos con el servicio)
  this.reviews = [
    { id: 1, name: 'Juan Pérez', rating: 5, comment: 'Excelente producto!', createdAt: new Date() },
    { id: 2, name: 'María López', rating: 4, comment: 'Muy bueno, pero tardó un poco el envío.', createdAt: new Date() }
  ];
  this.updateAverageRating();
}

// Calcular promedio
updateAverageRating(): void {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    return;
  }
  const total = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.averageRating = parseFloat((total / this.reviews.length).toFixed(1));
}

// Publicar comentario
addReview(): void {
  if (this.reviewForm.invalid) return;

  const newReview: Review = {
    ...this.reviewForm.value,
    id: this.reviews.length + 1,
    createdAt: new Date(),
  };

  this.reviews.unshift(newReview); // Inserta arriba
  this.reviewForm.reset({ rating: 0 });
  this.updateAverageRating();
  
}

}
interface Review {
  id?: number;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
