
import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, tap, switchMap, finalize } from 'rxjs/operators';
// Importaciones necesarias:
import { PedidoDetalleResponse } from '@core/models/pedido/pedido.model';
import { FormatoUltimosDigitos } from '@shared/pipes/formatoUltimosDigitos.pipe';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { PedidoService } from '@core/services/pedidos/pedido.service';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { of } from 'rxjs'; // Necesario para of()
// Servicios y Modelos que debes importar (verifica tus paths)
import { AuthService } from '@core/services/auth/auth';
import { ClienteResponse } from '@core/models/usuarios/usuario-model'; // Asegúrate que esta ruta es correcta
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-detalle-pedido-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, FormatoUltimosDigitos],
  templateUrl: './detalle-pedido-modal.html',
  styleUrls: ['./detalle-pedido-modal.scss']
})
export class DetallePedidoModal implements OnChanges {
  // Inyecciones
  private tarjetaService = inject(TarjetaService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/usuarios`;
  private pedidoService = inject(PedidoService); // Necesario para obtener el detalle del pedido
  private clienteService = inject(ClienteService);

  @Input() detalle: PedidoDetalleResponse | null = null;
  @Input() showModal: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  //Estados
  datosCliente: ClienteResponse | null = null;
  isLoadingClientData: boolean = false;
  pedidoId: number | string | null = null;

  // Detecta cuando showModal cambia para disparar la carga de datos
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['detalle'] && this.detalle?.pedidoId) {
      this.pedidoId = this.detalle.pedidoId;
    }

    if (changes['showModal'] && changes['showModal'].currentValue === true) {
      // La lógica de cargar el detalle de pedido ya fue llamada en HistorialComprasComponent,
      this.cargarDatosCliente();
    }

    if (changes['showModal'] && changes['showModal'].currentValue === false) {
      this.datosCliente = null;
    }
  }

  /**
   * Obtiene los datos completos del cliente autenticado.
   * Depende del Interceptor para adjuntar el token.
   */
  cargarDatosCliente(): void {
    this.datosCliente = null;
    this.isLoadingClientData = true;

    const currentUser = this.authService.getCurrentUser();

    if (!currentUser || !currentUser.uid) {
      console.warn('Usuario no autenticado o UID faltante.');
      this.isLoadingClientData = false;
      return;
    }

    const firebaseUid = currentUser.uid;

    // Llamada estándar. Si falla con 403, el token no es el problema, sino el backend.
    this.clienteService.obtenerPerfil(firebaseUid).pipe(
      tap(perfil => {
        this.datosCliente = perfil;
      }),
      catchError(error => {
        console.error('❌ Error al obtener perfil del cliente:', error);
        // Mostrar un error amigable o dejar nulo para que el template maneje la ausencia de datos
        this.datosCliente = null;
        return of(error);
      }),
      finalize(() => {
        this.isLoadingClientData = false;
      })
    ).subscribe();
  }


  // Métodos de utilidad de estado
  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'APROBADO': 'bg-success',
      'RECHAZADO': 'bg-danger',
      'PENDIENTE': 'bg-warning text-dark',
      'PROCESANDO': 'bg-info'
    };
    return clases[estado] || 'bg-secondary';
  }

  // Método para cerrar el modal y notificar al padre
  onClose(): void {
    this.closeModal.emit();
  }
}