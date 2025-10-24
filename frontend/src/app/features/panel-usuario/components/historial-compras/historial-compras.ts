import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// ⚠️ Usaremos ComprasService, asumiendo que incluye las interfaces Compra, etc.
import { Compra, FiltroFecha, ProductoCompra } from '@core/models/pedido/compras.model';
import { NotificacionService } from '@core/services/notificaciones/servicio-notificacion';

// Importamos el DTO de detalle que obtendremos del backend (Fase 6)
import { PedidoDetalleResponse } from '@core/models/pedido/pedido.model';
// Importaremos el componente del modal que construiremos en la Fase 8
import { DetallePedidoModal } from '@shared/components/detalle-pedido-modal/detalle-pedido-modal';
import { PedidoService } from '@core/services/pedidos/pedido.service';

@Component({
  selector: 'app-historial-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DetallePedidoModal],
  templateUrl: './historial-compras.html',
  styleUrl: './historial-compras.scss'
})
export class HistorialComprasComponent implements OnInit {

  // === DATOS ===
  comprasOriginales: Compra[] = [];
  comprasFiltradas: Compra[] = [];
  comprasPaginadas: Compra[] = [];
  compraSeleccionada: Compra | null = null;

  //NUEVOS CAMPOS PARA EL MODAL (Fase 8)
  pedidoDetalleSeleccionado: PedidoDetalleResponse | null = null;
  mostrarModal: boolean = false;

  // === FILTROS ===
  filtrosFecha: FiltroFecha[] = [
    { valor: 'recientes', nombre: 'Últimas compras', icono: 'fas fa-clock', contador: 0 },
    { valor: '30dias', nombre: '30 días', icono: 'fas fa-calendar-day', contador: 0 },
    { valor: '3meses', nombre: '3 meses', icono: 'fas fa-calendar-week', contador: 0 },
    { valor: '6meses', nombre: '6 meses', icono: 'fas fa-calendar-alt', contador: 0 },
    { valor: '2024', nombre: '2024', icono: 'fas fa-calendar', contador: 0 },
    { valor: '2023', nombre: '2023', icono: 'fas fa-calendar', contador: 0 }
  ];

  filtroFechaSeleccionado: string = 'recientes';
  terminoBusqueda: string = '';

  // === ORDENAMIENTO ===
  campoOrden: 'fecha' | 'total' | 'numeroPedido' | 'estado' = 'fecha';
  ordenAscendente: boolean = false;

  // === PAGINACIÓN ===
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;

  // === ESTADOS ===
  isLoading: boolean = true;


  constructor(
    private comprasService: PedidoService,
    private notificacionService: NotificacionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCompras();
  }

  // === CARGA DE DATOS ===
  async cargarCompras(): Promise<void> {
    this.isLoading = true;

    try {
      //Llama al servicio que trae la lista de pedidos (GET /api/pedidos/mis-pedidos)
      this.comprasOriginales = await this.comprasService.obtenerHistorial().toPromise() || [];
      this.actualizarContadoresFiltros();
      this.aplicarFiltros();
      this.ordenarCompras();
      this.actualizarPaginacion();
    } catch (error) {
      console.error('Error al cargar compras:', error);
      this.notificacionService.showToast('Error al cargar el historial de compras', 'error');
      this.comprasOriginales = [];
      this.comprasFiltradas = [];
    } finally {
      this.isLoading = false;
    }
  }

  //NUEVO MÉTODO PARA ABRIR MODAL
  openDetalleModal(compra: Compra): void {
    this.notificacionService.showToast('Cargando detalle del pedido...', 'info');
    this.comprasService.obtenerDetallePedido(compra.id).subscribe({
      next: (detalle) => {
        if (detalle) {
          this.pedidoDetalleSeleccionado = detalle;
          this.mostrarModal = true;
          // Si estás usando Bootstrap modal, debes abrirlo aquí.
          const modalElement = document.getElementById('modalDetalleCompra');
          if (modalElement) {
            const modal = new (window as any).bootstrap.Modal(modalElement);
            modal.show();
          }
        }
      },
      error: (e) => {
        this.notificacionService.showToast('Error al cargar el detalle completo.', 'error');
        console.error(e);
      }
    });
  }

  //NUEVO MÉTODO PARA CERRAR MODAL (se llama desde el hijo)
  closeDetalleModal(): void {
    this.mostrarModal = false;
    this.pedidoDetalleSeleccionado = null;

    // Si usas Bootstrap, asegúrate de ocultarlo también
    const modalElement = document.getElementById('modalDetalleCompra');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }

  // === FILTROS ===
  seleccionarFiltroFecha(filtro: string): void {
    this.filtroFechaSeleccionado = filtro;
    this.paginaActual = 1;
    this.aplicarFiltros();
    this.actualizarPaginacion();
  }

  buscarPorPedido(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
    this.actualizarPaginacion();
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.buscarPorPedido();
  }

  private aplicarFiltros(): void {
    let comprasFiltradas = [...this.comprasOriginales];

    // Filtro por fecha
    if (this.filtroFechaSeleccionado !== 'todas') {
      comprasFiltradas = this.filtrarPorFecha(comprasFiltradas, this.filtroFechaSeleccionado);
    }

    // Filtro por término de búsqueda
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      comprasFiltradas = comprasFiltradas.filter(compra =>
        compra.numeroPedido.toLowerCase().includes(termino) ||
        compra.id.toLowerCase().includes(termino)
      );
    }

    this.comprasFiltradas = comprasFiltradas;
  }

  private filtrarPorFecha(compras: Compra[], filtro: string): Compra[] {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    switch (filtro) {
      case 'recientes':
        // Últimas 5 compras
        return compras.slice(0, 5);

      case '30dias':
        const hace30Dias = new Date(inicioHoy.getTime() - (30 * 24 * 60 * 60 * 1000));
        return compras.filter(c => new Date(c.fecha) >= hace30Dias);

      case '3meses':
        const hace3Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 3, ahora.getDate());
        return compras.filter(c => new Date(c.fecha) >= hace3Meses);

      case '6meses':
        const hace6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 6, ahora.getDate());
        return compras.filter(c => new Date(c.fecha) >= hace6Meses);

      default:
        // Filtro por año específico
        if (filtro.match(/^\d{4}$/)) {
          const año = parseInt(filtro);
          return compras.filter(c => new Date(c.fecha).getFullYear() === año);
        }
        return compras;
    }
  }

  private actualizarContadoresFiltros(): void {
    this.filtrosFecha.forEach(filtro => {
      filtro.contador = this.filtrarPorFecha(this.comprasOriginales, filtro.valor).length;
    });

    // Agregar años dinámicamente si tienen compras
    const añosConCompras = [...new Set(
      this.comprasOriginales.map(c => new Date(c.fecha).getFullYear())
    )].sort((a, b) => b - a);

    // Remover años existentes para evitar duplicados
    this.filtrosFecha = this.filtrosFecha.filter(f => !f.valor.match(/^\d{4}$/));

    // Agregar años con compras
    añosConCompras.forEach(año => {
      const comprasDelAño = this.filtrarPorFecha(this.comprasOriginales, año.toString()).length;
      if (comprasDelAño > 0) {
        this.filtrosFecha.push({
          valor: año.toString(),
          nombre: año.toString(),
          icono: 'fas fa-calendar',
          contador: comprasDelAño
        });
      }
    });
  }

  // === ORDENAMIENTO ===
  ordenarPor(campo: 'fecha' | 'total' | 'numeroPedido' | 'estado'): void {
    if (this.campoOrden === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.campoOrden = campo;
      this.ordenAscendente = campo === 'numeroPedido' || campo === 'estado';
    }

    this.ordenarCompras();
    this.actualizarPaginacion();
  }

  private ordenarCompras(): void {
    this.comprasFiltradas.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (this.campoOrden) {
        case 'fecha':
          valorA = new Date(a.fecha).getTime();
          valorB = new Date(b.fecha).getTime();
          break;
        case 'total':
          valorA = a.total;
          valorB = b.total;
          break;
        case 'numeroPedido':
          valorA = a.numeroPedido;
          valorB = b.numeroPedido;
          break;
        case 'estado':
          valorA = a.estado;
          valorB = b.estado;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
  }

  // === PAGINACIÓN ===
  private actualizarPaginacion(): void {
    this.totalPaginas = Math.ceil(this.comprasFiltradas.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = Math.max(1, this.totalPaginas);
    }
    this.actualizarComprasPaginadas();
  }

  private actualizarComprasPaginadas(): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.comprasPaginadas = this.comprasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarComprasPaginadas();
    }
  }

  obtenerPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const maxVisible = 5;
    const mitad = Math.floor(maxVisible / 2);

    let inicio = Math.max(1, this.paginaActual - mitad);
    let fin = Math.min(this.totalPaginas, inicio + maxVisible - 1);

    // Ajustar inicio si estamos cerca del final
    if (fin - inicio < maxVisible - 1) {
      inicio = Math.max(1, fin - maxVisible + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  // === UTILIDADES DE FORMATO ===
  formatearFecha(fecha: string | Date): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  obtenerFechaRelativa(fecha: string | Date): string {
    const ahora = new Date();
    const fechaCompra = new Date(fecha);
    const diferenciaDias = Math.floor((ahora.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));

    if (diferenciaDias === 0) return 'Hoy';
    if (diferenciaDias === 1) return 'Ayer';
    if (diferenciaDias < 7) return `Hace ${diferenciaDias} días`;
    if (diferenciaDias < 30) return `Hace ${Math.floor(diferenciaDias / 7)} semana${Math.floor(diferenciaDias / 7) !== 1 ? 's' : ''}`;
    if (diferenciaDias < 365) return `Hace ${Math.floor(diferenciaDias / 30)} mes${Math.floor(diferenciaDias / 30) !== 1 ? 'es' : ''}`;
    return `Hace ${Math.floor(diferenciaDias / 365)} año${Math.floor(diferenciaDias / 365) !== 1 ? 's' : ''}`;
  }

  esCompraReciente(fecha: string | Date): boolean {
    const ahora = new Date();
    const fechaCompra = new Date(fecha);
    const diferenciaDias = (ahora.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24);
    return diferenciaDias <= 7; // Últimos 7 días
  }

  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'bg-warning text-dark',
      'procesando': 'bg-info text-white',
      'enviado': 'bg-primary text-white',
      'entregado': 'bg-success text-white',
      'cancelado': 'bg-danger text-white',
      'devuelto': 'bg-secondary text-white'
    };
    return clases[estado.toLowerCase()] || 'bg-secondary text-white';
  }

  obtenerIconoEstado(estado: string): string {
    const iconos: { [key: string]: string } = {
      'pendiente': 'fas fa-clock',
      'procesando': 'fas fa-cog fa-spin',
      'enviado': 'fas fa-truck',
      'entregado': 'fas fa-check-circle',
      'cancelado': 'fas fa-times-circle',
      'devuelto': 'fas fa-undo'
    };
    return iconos[estado.toLowerCase()] || 'fas fa-question-circle';
  }

  calcularTotalGastado(): number {
    return this.comprasFiltradas.reduce((total, compra) => total + compra.total, 0);
  }

  // === ACCIONES ===
  verDetalleCompra(compra: Compra): void {
    this.compraSeleccionada = compra;

    // Usar Bootstrap modal (asegúrate de tener Bootstrap JS cargado)
    const modalElement = document.getElementById('modalDetalleCompra');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  puedeDescargarFactura(compra: Compra): boolean {
    const estadosConFactura = ['entregado', 'procesando', 'enviado'];
    return estadosConFactura.includes(compra.estado.toLowerCase());
  }

  async descargarFactura(compra: Compra): Promise<void> {
    try {
      this.notificacionService.showToast('Generando factura...', 'info');

      // Llamar al servicio para descargar la factura
      const archivoFactura = await this.comprasService.descargarFactura(compra.id).toPromise();

      if (archivoFactura) {
        // Crear enlace de descarga
        const blob = new Blob([archivoFactura], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Factura-${compra.numeroPedido}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.notificacionService.showToast('Factura descargada exitosamente', 'success');
      }
    } catch (error) {
      console.error('Error al descargar factura:', error);
      this.notificacionService.showToast('Error al descargar la factura', 'error');
    }
  }

  irAlCatalogo(): void {
    this.router.navigate(['/catalogo']); // Ajusta la ruta según tu routing
  }

  // === TRACKBY FUNCTIONS ===
  trackByCompraId(index: number, compra: Compra): string {
    return compra.id;
  }

  trackByProductoId(index: number, producto: ProductoCompra): string {
    return `${producto.id}-${index}`;
  }
}