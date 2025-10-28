import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Product } from '@core/services/productos/producto-adapter.service';
import { CategoriaService } from '@core/services/categorias/categoria.service';
import { ProductoManagementService } from '@core/services/productos/producto.admin.service';
import { ProductoDetalle } from '@core/models/productos/producto-backend.model';
import { Subscription } from 'rxjs';
import { Categoria } from '@core/models/categoria/categoria.model';

declare var bootstrap: any;

@Component({
  selector: 'app-modal-agregar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-agregar.html',
  styleUrls: ['./modal-agregar.scss']
})
export class ModalAgregar implements OnInit, OnDestroy {

  private managementService = inject(ProductoManagementService);
  private categoriaService = inject(CategoriaService)

  @Output() productoAgregado = new EventEmitter<ProductoDetalle>();

  producto: Product = this.getEmptyProduct();

  tallasInput: string = '';
  coloresInput: string = '';

  categoriasUnicas: Categoria[] = [];
  nuevaCategoria: string = '';
  errorMessage: string = '';

  private categoriesSubscription?: Subscription;

  ngOnInit(): void {
      this.loadCategories();
  }
  
  ngOnDestroy(): void {
      this.categoriesSubscription?.unsubscribe();
  }

  guardarProducto() {
    this.mapearVariaciones();

    if (!this.producto.name || !this.producto.sku || !this.producto.category) {
      alert('Por favor completa los campos obligatorios: Nombre, SKU y Categoría.');
      return;
    }

    if (this.producto.hasSizes && (!this.producto.sizes || this.producto.sizes.length === 0)) {
      alert('Has activado tallas, pero la lista está vacía. Usa comas para separarlas.');
      return;
    }

    if (this.producto.hasColors && (!this.producto.colors || this.producto.colors.length === 0)) {
      alert('Has activado colores, pero la lista está vacía. Usa comas para separarlos.');
      return;
    }

    this.managementService.addProduct(this.producto).subscribe({
      next: (res: ProductoDetalle) => {
        alert('Producto agregado correctamente.');
        this.productoAgregado.emit(res);
        this.resetForm();
        this.cerrarModal();
      },
      error: (err) => {
        console.error('Error al agregar producto:', err);
        alert('Error al agregar el producto. Inténtalo de nuevo.');
      }
    });
  }

  loadCategories(): void {
    console.log('Iniciando carga de categorías...');

    this.categoriesSubscription = this.categoriaService.obtenerCategoriasActivas().subscribe({
      next: (categorias: Categoria[]) => {
        console.log('Categorías recibidas del backend:', categorias);
        console.log('Cantidad de categorías:', categorias.length);

        this.categoriasUnicas = categorias;

        console.log('Categorías finales procesadas:', this.categoriasUnicas);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.errorMessage = 'Error al cargar las categorías';
      }
    });
  }

  mapearVariaciones() {
    if (this.producto.hasSizes && this.tallasInput.trim()) {
      this.producto.sizes = this.tallasInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(value => ({ name_size: '', value_size: value }));
    } else {
      this.producto.sizes = [];
    }

    if (this.producto.hasColors && this.coloresInput.trim()) {
      this.producto.colors = this.coloresInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(value => ({ name_color: '', value_color: value }));
    } else {
      this.producto.colors = [];
    }
  }

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
      this.producto.imagenFile = file;
      this.producto.imagenFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.producto.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagen(event: Event) {
    event.stopPropagation();
    this.producto.imagenPreview = undefined;
    this.producto.imagenFileName = undefined;
    this.producto.imagenFile = undefined;
    this.producto.image = '';
  }

  onTieneTallasChange() {
    if (!this.producto.hasSizes) {
      this.tallasInput = '';
      this.producto.sizes = [];
    }
  }

  onTieneColoresChange() {
    if (!this.producto.hasColors) {
      this.coloresInput = '';
      this.producto.colors = [];
    }
  }

  getEmptyProduct(): Product {
    return {
      id: 0,
      name: '',
      sku: '',
      price: 0,
      stock: 0,
      category: '',
      image: '',
      description: '',
      estado: true,
      dateAdded: new Date(),
      activarPrecioPorPaquete: false,
      precioPorPaquete: 0,
      hasSizes: false,
      hasColors: false,
      sizes: [],
      colors: []
    } as Product;
  }

  resetForm() {
    this.producto = this.getEmptyProduct();
    this.tallasInput = '';
    this.coloresInput = '';
    this.nuevaCategoria = '';
  }

  cerrarModal() {
    const modalElement = document.getElementById('crearProductoModal');
    const modal = (window as any).bootstrap?.Modal.getInstance(modalElement);
    modal?.hide();
  }
}
