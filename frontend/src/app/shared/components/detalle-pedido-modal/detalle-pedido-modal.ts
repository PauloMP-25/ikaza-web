import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, catchError, tap, finalize, of, switchMap } from 'rxjs';

import { PedidoDetalleResponse } from '@core/models/pedido/pedido.model';
import { FormatoUltimosDigitos } from '@shared/pipes/formatoUltimosDigitos.pipe';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { PedidoService } from '@core/services/pedidos/pedido.service';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { AuthService } from '@core/services/auth/auth';
import { ClienteResponse } from '@core/models/usuarios/usuario-model';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-detalle-pedido-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, FormatoUltimosDigitos],
  templateUrl: './detalle-pedido-modal.html',
  styleUrls: ['./detalle-pedido-modal.scss']
})
export class DetallePedidoModal implements OnChanges {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private tarjetaService = inject(TarjetaService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private pedidoService = inject(PedidoService);
  private clienteService = inject(ClienteService);
  private apiUrl = `${environment.apiUrl}/api/usuarios`;

  // ============================================================================
  // INPUTS Y OUTPUTS
  // ============================================================================
  @Input() detalle: PedidoDetalleResponse | null = null;
  @Input() showModal: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  // ============================================================================
  // ESTADO DEL COMPONENTE
  // ============================================================================
  datosCliente: ClienteResponse | null = null;
  isLoadingClientData: boolean = false;
  pedidoId: number | string | null = null;

  // ============================================================================
  // SUBJECT PARA LIMPIAR SUBSCRIPTIONS
  // ============================================================================
  private destroy$ = new Subject<void>();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Detecta cambios en los inputs
   * - Se ejecuta cada vez que showModal cambia (abrir/cerrar)
   * - Se ejecuta cada vez que detalle cambia (nuevo pedido)
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar pedidoId cuando cambia el detalle
    if (changes['detalle'] && this.detalle?.pedidoId) {
      this.pedidoId = this.detalle.pedidoId;
    }

    // Cargar datos del cliente cuando se abre el modal
    if (changes['showModal'] && changes['showModal'].currentValue === true) {
      console.log('Modal abierto, cargando datos del cliente...');
      this.cargarDatosCliente();
    }

    // Limpiar datos cuando se cierra el modal
    if (changes['showModal'] && changes['showModal'].currentValue === false) {
      console.log('Modal cerrado, limpiando datos...');
      this.limpiarDatos();
    }
  }

  /**
   * Limpiar subscriptions al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  // ============================================================================
  // CARGA DE DATOS - VERSIÓN REACTIVA
  // ============================================================================

  /**
   *  Cargar datos del cliente (REACTIVO OPTIMIZADO)
   */
  private cargarDatosCliente(): void {
    this.datosCliente = null;
    this.isLoadingClientData = true;

    this.authService.getCurrentUser$().pipe(
      takeUntil(this.destroy$),
      tap(currentUser => {
        if (!currentUser || !currentUser.uid) {
          console.warn('Usuario no autenticado o UID faltante.');
          throw new Error('Usuario no autenticado');
        }
        console.log('Usuario obtenido:', currentUser.email);
      }),
      //switchMap: Encadena la llamada al backend sin anidar subscriptions
      switchMap(currentUser =>
        this.clienteService.obtenerPerfil(currentUser!.uid).pipe(
          tap(perfil => {
            console.log('Perfil del cliente obtenido:', perfil);
            this.datosCliente = perfil;
          }),
          catchError(error => {
            console.error('Error al obtener perfil del cliente:', error);
            this.datosCliente = null;

            // Mensajes específicos según el error
            if (error.status === 404) {
              console.warn('Perfil del cliente no encontrado');
            } else if (error.status === 403) {
              console.error('Sin permisos para acceder al perfil');
            }

            return of(null);
          })
        )
      ),
      catchError(error => {
        console.error('Error obteniendo usuario autenticado:', error);
        return of(null);
      }),
      finalize(() => {
        this.isLoadingClientData = false;
      })
    ).subscribe();
  }

  // ============================================================================
  // MÉTODOS DE LIMPIEZA
  // ============================================================================

  /**
   * Limpiar datos cuando se cierra el modal
   * IMPORTANTE:
   * - Evita que datos de un pedido anterior se muestren al abrir otro
   * - Cancela cualquier petición en curso
   */
  private limpiarDatos(): void {
    this.datosCliente = null;
    this.isLoadingClientData = false;

    // Cancelar cualquier petición en curso
    this.destroy$.next();
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Obtener clase CSS según el estado del pedido
   */
  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'APROBADO': 'bg-success',
      'RECHAZADO': 'bg-danger',
      'PENDIENTE': 'bg-warning text-dark',
      'PROCESANDO': 'bg-info'
    };
    return clases[estado] || 'bg-secondary';
  }

  /**
   * Cerrar modal y notificar al componente padre
   */
  onClose(): void {
    console.log('Cerrando modal...');
    this.closeModal.emit();
  }
}