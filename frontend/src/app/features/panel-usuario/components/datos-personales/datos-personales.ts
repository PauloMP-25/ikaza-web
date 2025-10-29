import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '@core/services/auth/auth';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { ActualizarClienteRequest } from '@core/models/cliente/cliente.models';
import { finalize, Observable } from 'rxjs';
import { takeUntil, tap, switchMap, Subject } from 'rxjs';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './datos-personales.html',
  styleUrl: './datos-personales.scss'
})
export class DatosPersonalesComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private clienteService = inject(ClienteService);

  // ============================================================================
  // PROPIEDADES
  // ============================================================================
  datosForm!: FormGroup;
  isPhoneVerified: boolean = false;
  isLoading: boolean = false;
  // La propiedad firebaseUid ha sido eliminada. El email se obtiene del formulario.

  // Lista de géneros
  generos = ['HOMBRE', 'MUJER', 'OTRO'];

  // ============================================================================
  //  SUBJECT PARA LIMPIAR SUBSCRIPTIONS (Prevenir Memory Leaks)
  // ============================================================================
  private destroy$ = new Subject<void>();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
  }

  /**
   * Limpiar subscriptions al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Inicializar formulario
   */
  private initializeForm(): void {
    this.datosForm = this.fb.group({
      nombreUsuario: [{ value: '', disabled: true }, Validators.required],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      nacimiento: ['', [Validators.required, this.mayorDeEdadValidator]],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      prefijo: ['+51', [Validators.pattern(/^\+\d{1,3}$/)]],
      telefono: ['', [Validators.pattern(/^[0-9]{9}$/)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      genero: ['', Validators.required]
    });
  }

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  private loadUserData(): void {
    this.authService.getCurrentUser$().pipe(
      // Limpiar automáticamente cuando el componente se destruya
      takeUntil(this.destroy$),

      // Procesar datos del usuario
      tap(currentUser => {
        if (!currentUser || !currentUser.email) {
          console.error('No hay usuario autenticado o email no disponible');
          return;
        }

        console.log('Usuario cargado:', currentUser);
        // El email es el nuevo identificador, se usa directamente.

        // Cargar datos básicos de Auth
        const authEmail = currentUser.email;
        const displayUsername = authEmail.split('@')[0] || 'Usuario';

        this.datosForm.patchValue({
          email: authEmail,
          nombreUsuario: displayUsername
        });
      }),

      // Cargar datos del backend en cascada
      switchMap(currentUser => {
        if (!currentUser || !currentUser.email) {
          // Si el email no está disponible, se lanza un error en la cadena del observable
          return new Observable<any>(observer => observer.error(new Error('Email de usuario no autenticado para cargar datos.')));
        }

        // FIX: Ahora pasamos el email en lugar del UID
        const authEmail = currentUser.email;
        const firebaseDisplayName = authEmail.split('@')[0] || 'Usuario';

        return this.cargarDatosDelBackend(authEmail, firebaseDisplayName);
      })
    ).subscribe({
      next: () => {
        console.log('Datos del usuario cargados completamente');
      },
      error: (error) => {
        console.error('Error cargando datos del usuario:', error);
        // Opcional: Mostrar mensaje de error al usuario
        alert('Error al cargar tus datos. Por favor recarga la página.');
      }
    });
  }

  /**
   * Carga los datos extendidos del perfil desde el backend usando el email.
   */
  private cargarDatosDelBackend(email: string, firebaseDisplayName: string) {
    // FIX: Se llama al método con el nombre refactorizado y se pasa el email
    return this.clienteService.obtenerPerfil(email).pipe(
      tap(clienteBackend => {
        console.log('Datos del backend cargados:', clienteBackend);

        const nameParts = firebaseDisplayName.split(' ');
        const fallbackNombre = clienteBackend.nombres || nameParts[0] || '';
        const fallbackApellido = clienteBackend.apellidos || nameParts.slice(1).join(' ') || '';

        this.datosForm.patchValue({
          nombre: clienteBackend.nombres || fallbackNombre,
          apellido: clienteBackend.apellidos || fallbackApellido,
          nacimiento: clienteBackend.fechaNacimiento?.split('T')[0] || '',
          dni: clienteBackend.numeroDocumento || '',
          prefijo: clienteBackend.prefijoTelefono || '+51',
          telefono: clienteBackend.telefono || '',
          genero: clienteBackend.genero || ''
        });

        this.isPhoneVerified = clienteBackend.telefonoVerificado;
      }),
      finalize(() => {
        // Este bloque se ejecuta siempre, haya éxito o error
      })
    );
  }

  // ============================================================================
  // VALIDADORES
  // ============================================================================

  /**
   * Validador personalizado para la edad
   */
  mayorDeEdadValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const birthDate = new Date(control.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 18 ? null : { menorDeEdad: true };
  }

  // ============================================================================
  // GUARDAR CAMBIOS
  // ============================================================================

  /**
   * Guardar cambios en el backend
   */
  guardarCambios(): void {
    if (this.datosForm.invalid) {
      alert('Por favor, corrige los errores en el formulario.');
      this.markFormGroupTouched(this.datosForm);
      return;
    }

    this.isLoading = true;

    // Obtener valores del formulario (incluyendo los deshabilitados como el email)
    const formData = this.datosForm.getRawValue();
    const userEmail = formData.email; // Obtener el email del formulario

    if (!userEmail) {
      console.error('Email de usuario no disponible para guardar cambios.');
      this.isLoading = false;
      alert('Error de autenticación. Intenta recargar la página.');
      return;
    }

    // Determinar el estado de verificación a enviar al backend
    const currentTelefono = formData.telefono;
    const telefonoVerificadoStatus = currentTelefono ? this.isPhoneVerified : false;

    // Preparar request
    const request: ActualizarClienteRequest = {
      nombres: formData.nombre,
      apellidos: formData.apellido,
      tipoDocumento: 'DNI',
      numeroDocumento: formData.dni,
      fechaNacimiento: formData.nacimiento,
      prefijoTelefono: currentTelefono ? formData.prefijo : null,
      telefono: currentTelefono ? currentTelefono : null,
      telefonoVerificado: this.isPhoneVerified,
      genero: formData.genero
    };

    // Guardar usando el endpoint PUT /api/clientes/perfil/{email}
    // FIX: Se pasa userEmail y se llama al método refactorizado
    this.clienteService.actualizarPerfil(userEmail, request)
      .pipe(
        takeUntil(this.destroy$), // Limpiar si el componente se destruye
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (usuario) => {
          console.log('Datos guardados en backend:', usuario);
          alert('Datos personales guardados correctamente');
          this.isPhoneVerified = telefonoVerificadoStatus;
        },
        error: (error) => {
          console.error('Error guardando datos:', error);
          const errorMessage = error.error?.mensaje ||
            'Error al guardar los datos. Por favor intenta nuevamente.';
          alert(errorMessage);
        }
      });
  }

  // ============================================================================
  // HELPERS PARA EL TEMPLATE
  // ============================================================================

  /**
   * Marcar todos los campos como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Obtener error de un campo para mostrar en el template
   */
  getFieldError(fieldName: string): string {
    const field = this.datosForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['pattern']) {
        if (fieldName === 'dni') return 'El DNI debe tener 8 dígitos';
        if (fieldName === 'telefono') return 'El teléfono debe tener 9 dígitos';
        if (fieldName === 'prefijo') return 'Prefijo inválido';
      }
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['menorDeEdad']) return 'Debes ser mayor de 18 años';
    }
    return '';
  }

  /**
   * Verificar si un campo es inválido
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.datosForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
