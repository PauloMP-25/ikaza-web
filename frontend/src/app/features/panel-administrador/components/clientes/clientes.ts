import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { ClienteResponse } from '@core/models/cliente/cliente.models';
import { DecimalPipe } from '@angular/common';

// ==========================================
// clientes.component.ts
// ==========================================

@Component({
  selector: 'app-clientes',
  imports: [CommonModule,FormsModule,DecimalPipe],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes implements OnInit {
  private clienteService = inject(ClienteService);

  estadisticas: any = {};
  clientes: ClienteResponse[] = [];
  filteredClientes: ClienteResponse[] = [];
  searchTerm: string = '';
  filterActivo: string = 'todos';
  showModal: boolean = false;
  selectedCliente: ClienteResponse | null = null;
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalItems: number = 0;

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarClientes();
  }

  cargarEstadisticas(): void {
    this.clienteService.obtenerEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas = data;
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas', error);
      }
    });
  }

  cargarClientes(): void {
    this.clienteService.listarClientes(this.currentPage, this.pageSize, 'fechaCreacion', 'DESC').subscribe({
      next: (response) => {
        this.clientes = response.clientes;
        this.filteredClientes = response.clientes;
        this.totalPages = response.totalPages;
        this.totalItems = response.totalItems;
        this.currentPage = response.currentPage;
      },
      error: (error) => {
        console.error('❌ Error al cargar clientes', error);
      }
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.clientes];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(cliente => 
        cliente.nombreCompleto?.toLowerCase().includes(term) ||
        cliente.email?.toLowerCase().includes(term) ||
        cliente.numeroDocumento?.includes(term) ||
        cliente.telefono?.includes(term)
      );
    }
    if (this.filterActivo === 'activos') {
      filtered = filtered.filter(c => c.activo);
    } else if (this.filterActivo === 'inactivos') {
      filtered = filtered.filter(c => !c.activo);
    }
    this.filteredClientes = filtered;
  }

  openModal(cliente: ClienteResponse): void {
    this.selectedCliente = cliente;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCliente = null;
  }

  toggleActivoUsuario(id: number, currentState: boolean): void {
    const action = currentState 
      ? this.clienteService.desactivarUsuario(id)
      : this.clienteService.activarUsuario(id);
    action.subscribe({
      next: (response) => {
        this.cargarClientes();
        this.closeModal();
      },
      error: (error) => {
        console.error('❌ Error al cambiar estado', error);
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getInitial(name: string | undefined): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cargarClientes();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cargarClientes();
    }
  }

  calcularPorcentaje(valor: number, total: number): string {
    if (!total) return '0';
    return ((valor / total) * 100).toFixed(1);
  }
}