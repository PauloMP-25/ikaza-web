// medios-pago.component.ts (REFACTORIZADO)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService } from '@core/services/notificaciones/servicio-notificacion';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { Tarjeta } from '@core/models/tarjeta/tarjeta.model';
import { ListaTarjetas } from './lista-tarjetas/lista-tarjetas';
import { FormularioTarjeta } from './formulario-tarjeta/formulario-tarjeta';

@Component({
  selector: 'app-medios-pago',
  standalone: true,
  imports: [
    CommonModule,
    ListaTarjetas,
    FormularioTarjeta
  ],
  templateUrl: './medios-pago.html',
  styleUrl: './medios-pago.scss'
})

export class MediosPagoComponent implements OnInit {
  tarjetasGuardadas: Tarjeta[] = [];
  mostrarForm = false;
  isLoading = false;

  constructor(
    private tarjetaService: TarjetaService,
    private notificacionService: NotificacionService
  ) {
    console.log('🏗️ CONSTRUCTOR MediosPagoComponent - Componente refactorizado');
  }

  ngOnInit(): void {
    this.cargarTarjetas();
  }

  /**
   * Carga las tarjetas guardadas del usuario
   */
  private cargarTarjetas(): void {
    console.log('🔥 INICIANDO cargarTarjetas()');
    this.isLoading = true;

    this.tarjetaService.obtenerTarjetas().subscribe({
      next: (tarjetas) => {
        console.log('✅ Tarjetas cargadas:', tarjetas);
        this.tarjetasGuardadas = tarjetas;
      },
      error: (error) => {
        console.error('❌ Error al cargar tarjetas:', error);
        this.notificacionService.showToast('Error al cargar tarjetas', 'error');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Alterna la visibilidad del formulario
   */
  toggleFormulario(): void {
    this.mostrarForm = !this.mostrarForm;
  }

  /**
   * Cancela la adición de tarjeta
   */
  cancelarAgregarTarjeta(): void {
    this.mostrarForm = false;
  }

  /**
   * Guarda una nueva tarjeta
   */
  guardarTarjeta(tarjeta: Tarjeta): void {
    console.log('📤 Guardando tarjeta:', tarjeta);

    // Validaciones críticas
    if (!tarjeta.tokenPago || tarjeta.tokenPago.trim() === '') {
      this.notificacionService.showToast('Error: Token de pago no generado', 'error');
      return;
    }

    if (!tarjeta.tipo || tarjeta.tipo.trim() === '') {
      this.notificacionService.showToast('Error: Tipo de tarjeta no especificado', 'error');
      return;
    }

    this.isLoading = true;

    // Verificar si ya existe una tarjeta con los mismos últimos 4 dígitos
    const existeDuplicada = this.tarjetasGuardadas.some(
      t => t.ultimos4Digitos === tarjeta.ultimos4Digitos &&
        t.tipoTarjeta === tarjeta.tipoTarjeta
    );

    if (existeDuplicada) {
      this.notificacionService.showToast('Ya tienes una tarjeta similar guardada', 'warning');
      this.isLoading = false;
      return;
    }

    console.log('🚀 Llamando al servicio para guardar tarjeta');

    this.tarjetaService.guardarTarjeta(tarjeta).subscribe({
      next: (response) => {
        console.log('✅ Tarjeta guardada exitosamente:', response);
        this.tarjetasGuardadas.push(response);
        this.notificacionService.showToast('Tarjeta agregada correctamente');
        this.cancelarAgregarTarjeta();
      },
      error: (err) => {
        console.error('❌ Error al guardar tarjeta:', err);
        this.handleError(err, 'guardar');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Elimina una tarjeta
   */
  eliminarTarjeta(index: number): void {
    const tarjetaAEliminar = this.tarjetasGuardadas[index];

    if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
      return;
    }

    if (!tarjetaAEliminar.idMetodo) {
      this.notificacionService.showToast('Error: Tarjeta sin ID para eliminar.', 'error');
      return;
    }

    this.isLoading = true;

    this.tarjetaService.eliminarTarjeta(tarjetaAEliminar.idMetodo).subscribe({
      next: () => {
        console.log('✅ Tarjeta eliminada correctamente');
        this.tarjetasGuardadas.splice(index, 1);
        this.notificacionService.showToast('Tarjeta eliminada correctamente');
      },
      error: (err) => {
        console.error('❌ Error al eliminar tarjeta:', err);
        this.handleError(err, 'eliminar');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Establece una tarjeta como principal
   */
  establecerPrincipal(index: number): void {
    const tarjeta = this.tarjetasGuardadas[index];

    if (!tarjeta.idMetodo) {
      this.notificacionService.showToast('Error: La tarjeta no tiene ID para actualizar.', 'error');
      return;
    }

    this.isLoading = true;

    // Crear una copia de la tarjeta con esPrincipal: true
    const tarjetaActualizada: Tarjeta = {
      ...tarjeta,
      esPrincipal: true
    };

    console.log('🆕 Estableciendo tarjeta principal:', tarjetaActualizada);

    this.tarjetaService.actualizarTarjetaPrincipal(tarjeta.idMetodo, tarjetaActualizada).subscribe({
      next: (response) => {
        console.log('✅ Principal actualizado:', response);
        this.cargarTarjetas(); // Recarga para actualizar lista
        this.notificacionService.showToast('Tarjeta principal establecida correctamente');
      },
      error: (err) => {
        console.error('❌ Error al establecer principal:', err);
        this.handleError(err, 'establecer como principal');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }


  /**
   * Maneja los errores de las peticiones HTTP
   */
  private handleError(error: any, accion: string): void {
    console.log('🛑 EJECUTANDO handleError() con:', error);

    let errorMessage = `Error desconocido al ${accion} la tarjeta.`;

    if (error.status === 400) {
      if (error.error?.errors) {
        const validationErrors = error.error.errors;
        let errorDetails = 'Errores de validación: ';
        for (const field in validationErrors) {
          errorDetails += `${field}: ${validationErrors[field]}; `;
        }
        errorMessage = errorDetails;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error en los datos al ${accion}. Verifica los campos requeridos.`;
      }
    } else if (error.status === 403) {
      errorMessage = `No tienes permisos para ${accion} esta tarjeta.`;
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.log('📢 Mostrando error al usuario:', errorMessage);
    this.notificacionService.showToast(errorMessage, 'error');
  }
}