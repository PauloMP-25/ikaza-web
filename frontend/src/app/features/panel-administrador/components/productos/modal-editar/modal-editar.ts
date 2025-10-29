// src/app/features/panel-administrador/productos/modal-editar/modal-editar.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductoManagementService } from '@core/services/productos/producto.admin.service';
import { Producto, ProductoDetalle, ProductoUpdateRequest } from '@core/models/productos/producto-backend.model';
import { ProductoFormData, productoDetalleToFormData } from '@core/models/productos/producto-form.model';
import { Categoria } from '@core/models/categoria/categoria.model';
import { Subscription } from 'rxjs';
import { CategoriaService } from '@core/services/categorias/categoria.service';

declare var bootstrap: any;

@Component({
  selector: 'app-modal-editar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-editar.html',
  styleUrls: ['./modal-editar.scss']
})
export class ModalEditar implements OnChanges {
  private managementService = inject(ProductoManagementService);
  private categoriaService = inject(CategoriaService);

  @Input() producto!: ProductoDetalle;
  @Output() productoEditado = new EventEmitter<Producto>();

  categorias: Categoria[] = [];
  formData: ProductoFormData = {} as ProductoFormData;

  private categoriesSubscription?: Subscription;

  tallasInput: string = '';
  coloresInput: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.categoriesSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['producto'] && this.producto) {
      // Convertir ProductoDetalle a FormData
      this.formData = productoDetalleToFormData(this.producto);
      this.cargarVariacionesAlInput();
    }
  }

  loadCategories(): void {
    this.categoriesSubscription = this.categoriaService.obtenerCategoriasActivas().subscribe({
      next: (categorias: Categoria[]) => {
        this.categorias = categorias;
        console.log('✅ Categorías cargadas:', this.categorias.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar categorías:', error);
        this.errorMessage = 'Error al cargar las categorías';
      }
    });
  }

  cargarVariacionesAlInput(): void {
    if (this.formData.variantes && this.formData.variantes.length > 0) {
      // Extraer tallas únicas
      const tallas = [...new Set(
        this.formData.variantes
          .map(v => v.talla)
          .filter(t => t)
      )];
      this.tallasInput = tallas.join(', ');

      // Extraer colores únicos
      const colores = [...new Set(
        this.formData.variantes
          .map(v => v.color)
          .filter(c => c)
      )];
      this.coloresInput = colores.join(', ');
    } else {
      this.tallasInput = '';
      this.coloresInput = '';
    }
  }

  guardarCambios(): void {
    // Validación
    if (!this.formData.nombreProducto?.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }

    // Construir ProductoUpdateRequest (solo campos de PostgreSQL)
    const updateRequest: ProductoUpdateRequest = {
      idCategoria: this.formData.idCategoria,
      nombreProducto: this.formData.nombreProducto,
      descripcionProducto: this.formData.descripcionProducto,
      precio: this.formData.precio,
      stock: this.formData.stock,
      stockMinimo: this.formData.stockMinimo
    };

    this.isLoading = true;

    // Actualizar producto (enviar archivo de imagen si existe)
    this.managementService.updateProduct(
      this.producto.idProducto,
      updateRequest,
      this.formData.imagenFile
    ).subscribe({
      next: (productoActualizado: Producto) => {
        alert('Producto actualizado correctamente');
        this.productoEditado.emit(productoActualizado);
        this.cerrarModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al actualizar producto:', err);
        alert('Error al actualizar el producto. Inténtalo de nuevo.');
        this.isLoading = false;
      }
    });
  }

  // --- MANEJO DE IMÁGENES (igual que ModalAgregar) ---

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    this.processFile(file);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }
  onDragLeave(event: DragEvent): void { event.preventDefault(); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File): void {
    if (file) {
      this.formData.imagenFile = file;
      this.formData.imagenFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagen(event: Event): void {
    event.stopPropagation();
    this.formData.imagenPreview = undefined;
    this.formData.imagenFileName = undefined;
    this.formData.imagenFile = undefined;
  }

  onTieneVariantesChange(): void {
    if (!this.formData.tieneVariantes) {
      this.tallasInput = '';
      this.coloresInput = '';
      this.formData.variantes = [];
    }
  }

  cerrarModal(): void {
    const modalElement = document.getElementById('editarProductoModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal?.hide();
  }
}