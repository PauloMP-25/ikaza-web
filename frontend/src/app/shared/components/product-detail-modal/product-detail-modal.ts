// src/app/components/detalle-producto/detalle-producto.component.ts
import { Component, OnInit, Input, OnChanges, OnDestroy, AfterViewInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductoService } from '@core/services/productos/producto.service';
import { ProductoDetalle, Variante } from '@core/models/productos/producto-backend.model';
import { Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

declare var bootstrap: any;

@Component({
    selector: 'app-product-detail-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './product-detail-modal.html',
    styleUrls: ['./product-detail-modal.scss']
})
export class ProductDetailModalComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
    @Input() product?: ProductoDetalle;
    @Input() showModal: boolean = false;
    @Output() addToCart = new EventEmitter<{ product: ProductoDetalle, variant?: Variante, qty: number }>();
    public selectedVariant?: Variante;

    private modalInstance: any = null;
    private modalElement: HTMLElement | null = null;
    private hiddenListener?: () => void; // Para remover listener en cleanup
    loading = false;
    errorMessage = '';
    selectedImageIndex: number = 0;
    public qty: number = 1;
    // Contador para el carrusel de imágenes

    constructor(
        private route: ActivatedRoute,
        private productoService: ProductoService
    ) { }

    ngAfterViewInit() {
        // Inicializa el modal y agrega listener una sola vez
        this.modalElement = document.getElementById('detalleModal');
        if (this.modalElement) {
            this.hiddenListener = this.onModalHidden.bind(this);
            this.modalElement.addEventListener('hidden.bs.modal', this.hiddenListener);
        }
    }

    ngOnInit(): void {
        const id = this.route.snapshot.params['id'];
        this.cargarProducto(+id);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['showModal'] && this.showModal) {
            this.openModal();
        } else if (!this.showModal) {
            this.closeModal();
        }
        if (changes['product'] && this.product) {
            this.selectedImageIndex = 0; // Resetear al cambiar de producto
            this.initializeSelections(); // <-- Llamar a inicialización
        }
    }

    private initializeSelections(): void {
        this.qty = 1;

        if (this.product && this.product.variantes && this.product.variantes.length > 0) {
            // Seleccionar la primera variante por defecto
            this.selectedVariant = this.product.variantes[0];

            // Si la variante tiene una imagen específica, mostrarla
            if (this.selectedVariant.imagenUrl && this.productImages.length > 0) {
                const variantImageIndex = this.productImages.findIndex(url => url === this.selectedVariant?.imagenUrl);
                this.selectedImageIndex = variantImageIndex >= 0 ? variantImageIndex : 0;
            }
        } else {
            this.selectedVariant = undefined;
        }
    }

    public selectVariant(variant: Variante): void {
        this.selectedVariant = variant;
        // Lógica opcional para cambiar la imagen seleccionada al cambiar de variante
    }

    ngOnDestroy() {
        this.closeModal();
        // Cleanup: Remover listener si existe
        if (this.modalElement && this.hiddenListener) {
            this.modalElement.removeEventListener('hidden.bs.modal', this.hiddenListener);
        }
    }

    // Obtener todas las imágenes del producto (maneja undefined de forma segura)
    get productImages(): string[] {
        if (!this.product) return [];

        const images: string[] = [];

        // Agrega imagenPrincipal si existe (no undefined)
        if (this.product.imagenPrincipal) {
            images.push(this.product.imagenPrincipal);
        }

        // Agrega imágenes adicionales de 'imagenes' (de ProductoDetalle)
        if (this.product.imagenes && this.product.imagenes.length > 0) {
            // Filtra solo no-principales y extrae URLs (ignora esPrincipal/orden si no los necesitas)
            const additionalImages = this.product.imagenes
                .filter(img => !img.esPrincipal) // Opcional: solo adicionales
                .map(img => img.url)
                .filter(url => url); // Filtra undefined/null

            images.push(...additionalImages);
        }

        // Fallback si no hay imágenes: Imagen por defecto
        if (images.length === 0) {
            images.push('assets/images/no-image.png'); // Ajusta la ruta
        }

        return images;
    }

    selectImage(index: number) {
        if (index >= 0 && index < this.productImages.length) {
            this.selectedImageIndex = index;
        }
    }

    // Método para abrir el modal
    openModal() {
        if (!this.modalElement) {
            this.modalElement = document.getElementById('detalleModal');
        }

        if (this.modalElement && bootstrap && this.product) { // Chequea product para evitar abrir sin datos
            if (this.modalInstance) {
                this.modalInstance.dispose();
            }

            // Crear nueva instancia del modal
            this.modalInstance = new bootstrap.Modal(this.modalElement, {
                backdrop: true,   // Evita cierre por click fuera (usa 'static' si quieres bloquear)
                keyboard: true    // Permite cerrar con ESC
            });

            // El listener ya se agregó en ngAfterViewInit
            this.modalInstance.show();
        } else {
            console.warn('Modal element not found, Bootstrap not loaded, or no product');
        }
    }

    // Método para cerrar el modal
    closeModal() {
        if (this.modalInstance) {
            this.modalInstance.hide();
        }
    }

    private onModalHidden() {
        // Limpiar backdrop manualmente (fix para múltiples modales)
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());

        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Resetear instancia
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
    }

    cargarProducto(id: number): void {
        this.loading = true;

        this.productoService.obtenerDetalleProducto(id).subscribe({
            next: (producto) => {
                this.product = producto;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error al cargar producto', error);
                this.errorMessage = 'Producto no encontrado';
                this.loading = false;
            }
        });
    }

    seleccionarImagen(index: number): void {
        this.selectedImageIndex = index;
    }

    public onAddToCart(): void {
        if (this.product) {
            this.addToCart.emit({
                product: this.product,
                variant: this.selectedVariant,
                qty: this.qty
            });
            this.closeModal();
        }
    }

    public get currentImageUrl(): string {
        return this.selectedVariant?.imagenUrl || this.productImages[this.selectedImageIndex] || '';
    }

    incrementarqty(): void {
        if (this.product && this.qty < this.product.stockDisponible!) {
            this.qty++;
        }
    }

    decrementarqty(): void {
        if (this.qty > 1) {
            this.qty--;
        }
    }
}