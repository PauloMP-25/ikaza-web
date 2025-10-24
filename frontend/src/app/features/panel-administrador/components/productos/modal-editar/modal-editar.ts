import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Product } from '@core/services/productos/producto-adapter.service';
import { ProductoManagementService } from '@core/services/productos/producto.admin.service';
import { ProductoDetalle } from '@core/models/productos/producto-backend.model';
import { Categoria } from '@core/models/categoria/categoria.model';

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

  @Input() producto!: Product;
  @Output() productoEditado = new EventEmitter<ProductoDetalle>();

  productoEditadoLocal: Product = {} as Product;
  categorias: Categoria[] = [];
  nuevaCategoria: string = '';
  
  tallasInput: string = '';
  coloresInput: string = '';
  fileInput: any;

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['producto'] && this.producto) {
      this.productoEditadoLocal = { ...this.producto };
      this.productoEditadoLocal.sizes = this.producto.sizes ? [...this.producto.sizes] : [];
      this.productoEditadoLocal.colors = this.producto.colors ? [...this.producto.colors] : [];
      this.cargarVariacionesAlInput();
    }
  }

  cargarVariacionesAlInput() {
    if (this.productoEditadoLocal.hasSizes && this.productoEditadoLocal.sizes) {
      this.tallasInput = this.productoEditadoLocal.sizes.map(t => t.value_size).join(', ');
    } else {
      this.tallasInput = '';
    }

    if (this.productoEditadoLocal.hasColors && this.productoEditadoLocal.colors) {
      this.coloresInput = this.productoEditadoLocal.colors.map(c => c.value_color).join(', ');
    } else {
      this.coloresInput = '';
    }
  }

  guardarCambios() {
    this.mapearVariaciones();

    if (
      !(this.productoEditadoLocal.name || '').trim() ||
      !(this.productoEditadoLocal.sku || '').trim() ||
      !(this.productoEditadoLocal.category || '').trim()
    ) {
      alert('Por favor completa los campos obligatorios: Nombre, SKU y Categoría.');
      return;
    }

    if (this.productoEditadoLocal.hasSizes && (!this.productoEditadoLocal.sizes || this.productoEditadoLocal.sizes.length === 0)) {
      alert('Has activado tallas, pero la lista es inválida o está vacía. Usa comas.');
      return;
    }

    if (this.productoEditadoLocal.hasColors && (!this.productoEditadoLocal.colors || this.productoEditadoLocal.colors.length === 0)) {
      alert('Has activado colores, pero la lista es inválida o está vacía. Usa comas.');
      return;
    }

    this.managementService.updateProduct(this.productoEditadoLocal).subscribe({
      next: (res: ProductoDetalle) => {
        alert('Producto editado correctamente');
        this.productoEditado.emit(res);
        this.cerrarModal();
      },
      error: (err) => {
        console.error('Error al editar producto', err);
        alert('Error al editar el producto. Inténtalo de nuevo.');
      }
    });
  }

  mapearVariaciones() {
    if (this.productoEditadoLocal.hasSizes && this.tallasInput.trim()) {
      this.productoEditadoLocal.sizes = this.tallasInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(value => ({ name_size: '', value_size: value }));
    } else {
      this.productoEditadoLocal.sizes = [];
    }

    if (this.productoEditadoLocal.hasColors && this.coloresInput.trim()) {
      this.productoEditadoLocal.colors = this.coloresInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(value => ({ name_color: '', value_color: value }));
    } else {
      this.productoEditadoLocal.colors = [];
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    this.processFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File): void {
    if (file) {
      this.productoEditadoLocal.imagenFile = file;
      this.productoEditadoLocal.imagenFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productoEditadoLocal.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagen(event: Event) {
    event.stopPropagation();
    this.productoEditadoLocal.imagenPreview = undefined;
    this.productoEditadoLocal.imagenFileName = undefined;
    this.productoEditadoLocal.imagenFile = undefined;
    this.productoEditadoLocal.image = '';
  }

  onTieneTallasChange() {
    if (!this.productoEditadoLocal.hasSizes) {
      this.tallasInput = '';
      this.productoEditadoLocal.sizes = [];
    }
  }

  onTieneColoresChange() {
    if (!this.productoEditadoLocal.hasColors) {
      this.coloresInput = '';
      this.productoEditadoLocal.colors = [];
    }
  }

  cerrarModal() {
    const modalElement = document.getElementById('editarProductoModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }
}
