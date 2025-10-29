import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoriaService } from '@core/services/categorias/categoria.service';
import { ProductoManagementService } from '@core/services/productos/producto.admin.service';
import { Producto} from '@core/models/productos/producto-backend.model';
import { Categoria } from '@core/models/categoria/categoria.model';
import { ProductoFormData, formDataToProductoRequest } from '@core/models/productos/producto-form.model';
import { Subscription } from 'rxjs';

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

  @Output() productoAgregado = new EventEmitter<Producto>();

  // Formulario usando el nuevo modelo
  formData: ProductoFormData = this.getEmptyFormData();

  // Inputs temporales para variantes (como antes)
  tallasInput: string = '';
  coloresInput: string = '';

  categorias: Categoria[] = [];
  errorMessage: string = '';
  isLoading: boolean = false;

  categoriasUnicas: Categoria[] = [];
  nuevaCategoria: string = '';

  private categoriesSubscription?: Subscription;
  ngOnInit() {
    console.log('🚀 CatalogoComponent: ngOnInit ejecutado');
    this.loadCategories();
  }

  ngOnInit(): void {
      this.loadCategories();
  }
  
  ngOnDestroy(): void {
      this.categoriesSubscription?.unsubscribe();
  }

  guardarProducto() {
    this.mapearVariaciones();

  /*
    Cargar todas las categorias
  */
  loadCategories(): void {
    this.categoriesSubscription = this.categoriaService.obtenerCategoriasActivas().subscribe({
      next: (categorias: Categoria[]) => {
        this.categorias = categorias;
        console.log('Categorías cargadas:', this.categorias.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar categorías:', error);
        this.errorMessage = 'Error al cargar las categorías';
      }
    });
  }

  guardarProducto(): void {
    // Validación básica
    if (!this.formData.nombreProducto?.trim() ||
      !this.formData.idCategoria ||
      !this.formData.precio) {
      alert('Por favor completa los campos obligatorios: Nombre, Categoría y Precio.');
      return;
    }

    // Mapear variantes desde los inputs
    this.mapearVariantes();

    // Convertir FormData a ProductoRequest
    const productoRequest = formDataToProductoRequest(this.formData);

    this.isLoading = true;

    // Llamar al servicio (pasa el archivo de imagen por separado)
    this.managementService.addProduct(productoRequest, this.formData.imagenFile).subscribe({
      next: (producto: Producto) => {
        alert('Producto agregado correctamente.');
        this.productoAgregado.emit(producto);
        this.resetForm();
        this.cerrarModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al agregar producto:', err);
        alert('Error al agregar el producto. Inténtalo de nuevo.');
        this.isLoading = false;
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
    }

    // Nota: En el backend, deberías tener un endpoint para gestionar variantes
    // Por ahora, esto no se está enviando directamente en ProductoRequest
    console.log('Variantes generadas:', variantes);
  }

  // --- MANEJO DE IMÁGENES ---

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

  // --- HELPERS ---

  onTieneVariantesChange(): void {
    if (!this.formData.tieneVariantes) {
      this.tallasInput = '';
      this.coloresInput = '';
    }
  }

  getEmptyFormData(): ProductoFormData {
    return {
      idCategoria: 0,
      nombreProducto: '',
      descripcionProducto: '',
      precio: 0,
      stock: 0,
      stockMinimo: 5,
      codigo: '',
      marca: '',
      tieneVariantes: false,
      imagenesUrls: []
    };
  }

  resetForm(): void {
    this.formData = this.getEmptyFormData();
    this.tallasInput = '';
    this.coloresInput = '';
  }

  cerrarModal(): void {
    const modalElement = document.getElementById('crearProductoModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal?.hide();
  }
}
