import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService } from '@core/services/notificaciones/servicio-notificacion';
import { DireccionService } from '@core/services/direcciones/direccion.service';
import { Direccion } from '@core/models/direcciones/direccion.model';
import { ListaDirecciones } from './lista-direcciones/lista-direcciones';
import { FormularioDireccion } from './formulario-direccion/formulario-direccion';


@Component({
  selector: 'app-direcciones',
  standalone: true,
  imports: [CommonModule, ListaDirecciones, FormularioDireccion],
  templateUrl: './direcciones.html',
  styleUrl: './direcciones.scss'
})
export class DireccionesComponent implements OnInit {
  @ViewChild(FormularioDireccion) formularioComponent!: FormularioDireccion;

  direccionesGuardadas: Direccion[] = [];
  mostrarForm = false;
  isLoading = false;
  editMode = false;
  direccionParaEditar: Direccion | null = null;
  editIndex: number | null = null;

  constructor(
    private notificacionService: NotificacionService,
    private direccionService: DireccionService
  ) {}

  ngOnInit(): void {
    this.cargarDirecciones();
  }

  /**
   * Carga las direcciones guardadas del usuario
  */
  private cargarDirecciones(): void {
    console.log('INICIANDO cargarDirecciones()');
    this.isLoading = true;
    this.direccionService.obtenerDirecciones().subscribe({
      next: (direcciones) => {
        console.log('✅ Direcciones cargadas:', direcciones);
        this.direccionesGuardadas = direcciones;
      },
      error: (error) => {
        console.error('❌ Error al cargar direcciones:', error);
        this.notificacionService.showToast('Error al cargar direcciones', 'error');
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
    if (!this.mostrarForm) {
      this.cancelarEdicion();
    }
  }

  /**
   * Cancela la edición y resetea el formulario
   */
  cancelarEdicion(): void {
    this.editMode = false;
    this.editIndex = null;
    this.direccionParaEditar = null;
    this.mostrarForm = false;

    // Resetear el formulario si existe
    if (this.formularioComponent) {
      this.formularioComponent.resetForm();
    }
  }

  /**
   * Prepara el formulario para editar una dirección
   */
  editarDireccion(index: number): void {
    const direccion = this.direccionesGuardadas[index];
    if (!direccion) return;

    console.log('📝 Editando dirección:', direccion);

    this.editIndex = index;
    this.editMode = true;
    this.direccionParaEditar = { ...direccion }; // Clonar para evitar mutación
    this.mostrarForm = true;
  }

  /**
   * Elimina una dirección
   */
  eliminarDireccion(index: number): void {
    const direccionAEliminar = this.direccionesGuardadas[index];

    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      return;
    }

    if (!direccionAEliminar.idDireccion) {
      this.notificacionService.showToast('Error: Dirección sin ID para eliminar.', 'error');
      return;
    }

    this.isLoading = true;
    this.direccionService.eliminarDireccion(direccionAEliminar.idDireccion).subscribe({
      next: () => {
        console.log('✅ Dirección eliminada correctamente');
        this.direccionesGuardadas.splice(index, 1);

        if (this.editIndex === index) {
          this.cancelarEdicion();
        }

        this.notificacionService.showToast('Dirección eliminada correctamente');
      },
      error: (err) => {
        console.error('❌ Error al eliminar:', err);
        this.handleError(err, 'eliminar');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Guarda o actualiza una dirección
   */
  guardarDireccion(direccion: Direccion): void {
    console.log('📤 Guardando dirección:', direccion);

    // Validación crítica
    if (!direccion.pais || direccion.pais.trim() === '') {
      this.notificacionService.showToast('El país es obligatorio', 'error');
      return;
    }

    if (!direccion.direccion || direccion.direccion.trim() === '') {
      this.notificacionService.showToast('La dirección específica es obligatoria', 'error');
      return;
    }

    this.isLoading = true;

    if (this.editMode && this.editIndex !== null) {
      // ACTUALIZAR dirección existente
      const direccionExistente = this.direccionesGuardadas[this.editIndex];

      if (!direccionExistente.idDireccion) {
        this.notificacionService.showToast('Error: Dirección sin ID.', 'error');
        this.isLoading = false;
        return;
      }

      console.log('🔄 ACTUALIZANDO dirección con ID:', direccionExistente.idDireccion);

      this.direccionService.actualizarDireccion(direccionExistente.idDireccion, direccion).subscribe({
        next: (response) => {
          console.log('✅ Dirección actualizada:', response);
          this.direccionesGuardadas[this.editIndex!] = response;
          this.notificacionService.showToast('Dirección actualizada correctamente');
          this.cancelarEdicion();
        },
        error: (err) => {
          console.error('❌ Error al actualizar:', err);
          this.handleError(err, 'actualizar');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } else {
      // GUARDAR nueva dirección
      console.log('🆕 GUARDANDO nueva dirección');

      this.direccionService.guardarDireccion(direccion).subscribe({
        next: (response) => {
          console.log('✅ Dirección guardada:', response);
          this.direccionesGuardadas.push(response);
          this.notificacionService.showToast('Dirección agregada correctamente');
          this.cancelarEdicion();
        },
        error: (err) => {
          console.error('❌ Error al guardar:', err);
          this.handleError(err, 'guardar');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Establece una dirección como principal
   */
  establecerPrincipal(index: number): void {
    const direccion = this.direccionesGuardadas[index];

    if (!direccion.idDireccion) {
      this.notificacionService.showToast('Error: La dirección no tiene ID para actualizar.', 'error');
      return;
    }

    this.isLoading = true;

    // Copia completa de la dirección + esPrincipal: true
    const request: Direccion = {
      ...direccion,
      esPrincipal: true
    };

    console.log('🆕 Estableciendo principal:', request);

    this.direccionService.actualizarDireccionPrincipal(direccion.idDireccion, request).subscribe({
      next: (response) => {
        console.log('✅ Principal actualizado:', response);
        this.cargarDirecciones(); // Recarga para actualizar lista
        this.notificacionService.showToast('Dirección principal establecida correctamente');
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

    let errorMessage = `Error desconocido al ${accion} la dirección.`;

    if (error.status === 400) {
      if (error.error?.errors) {
        // Errores de validación
        const validationErrors = error.error.errors;
        let errorDetails = 'Errores de validación: ';
        for (const field in validationErrors) {
          errorDetails += `${field}: ${validationErrors[field]}; `;
        }
        errorMessage = errorDetails;
      } else {
        errorMessage = `Error en los datos al ${accion}. Verifica los campos requeridos.`;
      }
    } else if (error.status === 403) {
      errorMessage = `No tienes permisos para ${accion} esta dirección.`;
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