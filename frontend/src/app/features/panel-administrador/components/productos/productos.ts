import { Component, OnInit, inject, OnDestroy } from '@angular/core'; // Añadido OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importar el Servicio de Categorías y el Modelo Categoria
import { CategoriaService } from '@core/services/categorias/categoria.service';
import { Categoria } from '@core/models/categoria/categoria.model'; // Asegúrate de que esta ruta sea correcta

import { Producto, ProductoDetalle, PageResponse } from '@core/models/productos/producto-backend.model';
import { ProductoService } from '@core/services/productos/producto.service';
import { ProductoManagementService } from '@core/services/productos/producto.admin.service';
import { ModalAgregar } from './modal-agregar/modal-agregar';
import { ModalEditar } from './modal-editar/modal-editar';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-productos',
    templateUrl: './productos.html',
    styleUrl: './productos.scss',
    standalone: true,
    imports: [CommonModule, ModalAgregar, FormsModule, ModalEditar]
})
export class Productos implements OnInit, OnDestroy { // Implementado OnDestroy

    private managementService = inject(ProductoManagementService);
    private productService = inject(ProductoService);
    private categoriaService = inject(CategoriaService); // <-- NUEVA INYECCIÓN

    productoAEditar: Producto | null = null;
    productos: ProductoDetalle[] = [];
    productosFiltrados: ProductoDetalle[] = [];

    // CAMBIO: Usaremos la lista completa de objetos Categoria para el filtro
    categoriasMaestras: Categoria[] = []; // <-- Variable para el filtro de la API

    filtro: string = '';
    categoriaSeleccionada: string = '';

    // Paginación frontend (para los productos filtrados)
    currentPage: number = 1;
    itemsPerPage: number = 8;
    totalPages: number = 1;

    // Estados de carga y error
    isLoading: boolean = false;
    errorMessage: string = '';
    private productsSubscription?: Subscription;
    private categoriesSubscription?: Subscription; // <-- NUEVA SUSCRIPCIÓN

    constructor() { }

    ngOnInit(): void {
        this.cargarProductos();
        this.cargarCategoriasMaestras(); // <-- NUEVA LLAMADA
    }

    /**
     * Limpiar suscripciones al destruir el componente
     */
    ngOnDestroy(): void {
        console.log('🧹 Productos Component: Destruyendo componente y limpiando suscripciones');
        this.productsSubscription?.unsubscribe();
        this.categoriesSubscription?.unsubscribe(); // <-- Limpiar la nueva suscripción
    }

    /**
     * Cargar productos con paginación desde el servicio real
     */
    cargarProductos() {
        console.log('📦 Iniciando carga de productos para administración...');
        this.isLoading = true;
        this.errorMessage = '';

        this.productsSubscription = this.productService.obtenerProductos(

            0, // Página 0 del backend
            1000, // Tamaño grande para obtener todos los productos
            'nombreProducto',
            'ASC'
        ).subscribe({
            next: (response: PageResponse<ProductoDetalle>) => {
                console.log('✅ Productos recibidos del backend:', response)
                console.log('Imagen del producto:',);
                ;

                this.productos = response.content;
                this.productosFiltrados = [...this.productos];
                // this.actualizarCategoriasUnicas(); <--- Eliminado/Reemplazado

                this.calcularTotalPages();
                this.currentPage = 1;
                this.isLoading = false;

                console.log('📊 Productos cargados:', this.productos.length);
            },
            error: (error) => {
                console.error('❌ Error al cargar productos:', error);
                this.errorMessage = 'Error al cargar los productos. Por favor, intenta nuevamente.';
                this.isLoading = false;
            }
        });
    }

    /**
     * NUEVA FUNCIÓN: Cargar la lista completa de categorías desde el backend.
     * Esta lista se usa para el filtro.
     */
    cargarCategoriasMaestras(): void {
        console.log('📂 Cargando lista maestra de categorías para el filtro...');

        this.categoriesSubscription = this.categoriaService.obtenerCategoriasActivas().subscribe({
            next: (categorias: Categoria[]) => {
                // Asegura que las categorías estén ordenadas (opcional)
                this.categoriasMaestras = categorias.sort((a, b) => a.nombreCategoria.localeCompare(b.nombreCategoria));
                console.log('✅ Filtros de categorías cargados:', this.categoriasMaestras.length);
            },
            error: (error) => {
                console.error('❌ Error al cargar filtros de categorías:', error);
                // Manejo de errores si es necesario
            }
        });
    }

    /*
     * ESTA FUNCIÓN FUE REEMPLAZADA Y ELIMINADA.
     * private actualizarCategoriasUnicas(): void { ... }
    */

    /**
     * Obtener productos paginados para la vista actual
     */
    get productosPaginados(): ProductoDetalle[] {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.productosFiltrados.slice(startIndex, endIndex);
    }

    /**
     * Calcular total de páginas
     */
    private calcularTotalPages(): void {
        this.totalPages = Math.ceil(this.productosFiltrados.length / this.itemsPerPage);
        if (this.totalPages === 0) this.totalPages = 1;
    }

    /**
     * Obtener índice final para mostrar en la paginación
     */
    getEndIndex(): number {
        const endIndex = this.currentPage * this.itemsPerPage;
        return endIndex > this.productosFiltrados.length ? this.productosFiltrados.length : endIndex;
    }

    /**
     * Obtener páginas intermedias para la paginación
     */
    getIntermediatePages(): number[] {
        const pages = [];
        const start = Math.max(2, this.currentPage - 1);
        const end = Math.min(this.totalPages - 1, this.currentPage + 1);

        for (let i = start; i <= end; i++) {
            if (i > 1 && i < this.totalPages) {
                pages.push(i);
            }
        }
        return pages;
    }

    /**
     * Cambiar página
     */
    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            console.log(`📄 Cambiando a página: ${page}`);
        }
    }

    /**
     * Manejar cambio de items por página
     */
    onItemsPerPageChange(): void {
        this.calcularTotalPages();
        this.currentPage = 1; // Volver a la primera página
    }

    /**
       * Evento emitido desde el modal para agregar un nuevo producto.
       */
    onProductoAgregado(nuevoProducto: ProductoDetalle) {
        console.log('Producto agregado:', nuevoProducto);
        this.productos.unshift(nuevoProducto); // Agregar al inicio
        this.filtrarProductos();
    }

    /**
    * Filtrado por texto (nombre, SKU o categoría) y por categoría seleccionada.
    */
    filtrarProductos() {
    const texto = (this.filtro || '').toLowerCase().trim();
    // 1. Convertir el ID seleccionado (string) a número. Si es vacío, será 0.
    const categoriaIdSeleccionada = Number(this.categoriaSeleccionada); 

    this.productosFiltrados = this.productos.filter(prod => {
        
        // Acceso directo a las propiedades de ProductoDetalle/Producto
        const nombre = String(prod.nombreProducto || '').toLowerCase();
        const sku = String(prod.codigo || '').toLowerCase();
        const descripcion = String(prod.descripcionProducto || '').toLowerCase();
        const marca = String(prod.marca || '').toLowerCase();
        
        // ✨ ACCESO DIRECTO AL NOMBRE E ID DE CATEGORÍA (modelo plano)
        const catNombre = String(prod.nombreCategoria || '').toLowerCase(); 
        const catId = prod.idCategoria; 

        // 3. Coincidencia por Texto (Busca en todos los campos, incluido nombreCategoria)
        const coincideTexto =
            nombre.includes(texto) ||
            sku.includes(texto) ||
            catNombre.includes(texto) || // Usamos el nombre plano para la búsqueda por texto
            descripcion.includes(texto) ||
            marca.includes(texto);

        // 4. Coincidencia por Categoría Seleccionada (Compara IDs)
        const coincideCategoria =
            // Si el ID seleccionado es 0 (o no es un número válido), se cumple la condición.
            !categoriaIdSeleccionada || 
            // Si no, verifica que los IDs coincidan.
            catId === categoriaIdSeleccionada; 

        return coincideTexto && coincideCategoria;
    });

    this.calcularTotalPages();
    this.currentPage = 1;
    console.log(`🔍 Filtro aplicado: "${texto}" | Categoría ID: "${categoriaIdSeleccionada}"`);
    console.log(`📊 Resultados: ${this.productosFiltrados.length} de ${this.productos.length} productos`);
}

    /**
     * Elimina un producto usando el servicio de administración.
     */
    eliminarProducto(prod: ProductoDetalle) {
        if (confirm(`¿Estás seguro de que quieres eliminar el producto "${prod.nombreProducto}"?`)) {
            console.log('🗑️ Eliminando producto:', prod.nombreProducto);

            this.productService.eliminarProducto(prod.idProducto).subscribe({
                next: () => {
                    console.log('✅ Producto eliminado exitosamente');
                    this.productos = this.productos.filter(p => p.idProducto !== prod.idProducto);
                    this.filtrarProductos();
                },
                error: (err) => {
                    console.error('❌ Error al eliminar producto:', err);
                    alert('Error al eliminar el producto. Inténtalo de nuevo.');
                }
            });
        }
    }

    // Selecciona un producto para edición y abre el modal correspondiente.
    editarProducto(prod: ProductoDetalle) {
        this.productoAEditar = prod;
    }

    /**
     * Actualiza el producto editado dentro de la lista.
     */
    onProductoEditado(productoEditado: ProductoDetalle) {
        console.log('✅ Producto editado:', productoEditado);
        const index = this.productos.findIndex(p => p.idProducto === productoEditado.idProducto);
        if (index !== -1) {
            this.productos[index] = productoEditado;
            this.filtrarProductos();
        }
    }
}