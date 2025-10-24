// src/app/components/productos/productos-lista/productos-lista.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductoService } from '@core/services/productos/producto.service';
import { Producto, PageResponse } from '@core/models/productos/producto-backend.model';
import { Categoria } from '@core/models/categoria/categoria.model';
import { CategoriaService} from '@core/services/categorias/categoria.service';


@Component({
    selector: 'app-productos-lista',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './productosSpring.html',
    styleUrl: './productosSpring.scss'
})
export class ProductosListaComponent implements OnInit {
    private productoService = inject(ProductoService);
    private categoriaService = inject(CategoriaService);

    // Estado de la lista
    productos: Producto[] = [];
    categorias: Categoria[] = [];
    isLoading: boolean = false;
    errorMessage: string = '';

    // Paginación
    currentPage: number = 0;
    pageSize: number = 12;
    totalPages: number = 0;
    totalElements: number = 0;

    // Filtros
    categoriaSeleccionada: number | null = null;
    terminoBusqueda: string = '';
    ordenamiento: string = 'nombreProducto';
    direccion: string = 'ASC';

    ngOnInit(): void {
        this.cargarCategorias();
        this.cargarProductos();
    }

    /**
     * Cargar categorías para el filtro
     */
    cargarCategorias(): void {
        this.categoriaService.obtenerCategoriasActivas().subscribe({
            next: (categorias) => {
                this.categorias = categorias;
            },
            error: (error) => {
                console.error('Error cargando categorías:', error);
            }
        });
    }

    /**
     * Cargar productos con filtros y paginación
     */
    cargarProductos(): void {
        this.isLoading = true;
        this.errorMessage = '';

        let request;

        if (this.terminoBusqueda.trim()) {
            // Búsqueda por texto
            request = this.productoService.buscarProductos(
                this.terminoBusqueda,
                this.currentPage,
                this.pageSize
            );
        } else if (this.categoriaSeleccionada) {
            // Filtrar por categoría
            request = this.productoService.obtenerProductosPorCategoria(
                this.categoriaSeleccionada,
                this.currentPage,
                this.pageSize
            );
        } else {
            // Obtener todos con paginación
            request = this.productoService.obtenerProductos(
                this.currentPage,
                this.pageSize,
                this.ordenamiento,
                this.direccion
            );
        }

        request.subscribe({
            next: (response: PageResponse<Producto>) => {
                this.productos = response.content;
                this.totalPages = response.totalPages;
                this.totalElements = response.totalElements;
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error cargando productos:', error);
                this.errorMessage = 'Error al cargar los productos. Por favor, intenta nuevamente.';
                this.isLoading = false;
            }
        });
    }

    /**
     * Buscar productos
     */
    buscarProductos(): void {
        this.currentPage = 0;
        this.cargarProductos();
    }

    /**
     * Filtrar por categoría
     */
    filtrarPorCategoria(idCategoria: number | null): void {
        this.categoriaSeleccionada = idCategoria;
        this.currentPage = 0;
        this.terminoBusqueda = '';
        this.cargarProductos();
    }

    /**
     * Cambiar ordenamiento
     */
    cambiarOrdenamiento(campo: string): void {
        if (this.ordenamiento === campo) {
            this.direccion = this.direccion === 'ASC' ? 'DESC' : 'ASC';
        } else {
            this.ordenamiento = campo;
            this.direccion = 'ASC';
        }
        this.currentPage = 0;
        this.cargarProductos();
    }

    /**
     * Ir a página
     */
    irAPagina(page: number): void {
        if (page >= 0 && page < this.totalPages) {
            this.currentPage = page;
            this.cargarProductos();
        }
    }

    /**
     * Formatear precio
     */
    formatearPrecio(precio: number): string {
        return `S/ ${precio.toFixed(2)}`;
    }

    /**
     * Obtener estado del stock
     */
    obtenerEstadoStock(stock: number): { clase: string; texto: string } {
        if (stock === 0) {
            return { clase: 'badge bg-danger', texto: 'Agotado' };
        } else if (stock < 10) {
            return { clase: 'badge bg-warning', texto: `Stock: ${stock}` };
        } else {
            return { clase: 'badge bg-success', texto: `Stock: ${stock}` };
        }
    }

    /**
     * Limpiar filtros
     */
    limpiarFiltros(): void {
        this.categoriaSeleccionada = null;
        this.terminoBusqueda = '';
        this.ordenamiento = 'nombreProducto';
        this.direccion = 'ASC';
        this.currentPage = 0;
        this.cargarProductos();
    }

    /**
     * Array de páginas para la paginación
     */
    get paginasArray(): number[] {
        const pages: number[] = [];
        const maxPages = 5;
        let startPage = Math.max(0, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(this.totalPages - 1, startPage + maxPages - 1);

        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(0, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }
}