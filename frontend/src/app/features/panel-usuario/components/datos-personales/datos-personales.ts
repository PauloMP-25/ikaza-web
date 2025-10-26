// src/app/components/panel-usuario/datos-personales/datos-personales.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '@core/services/auth/auth';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { ActualizarClienteRequest } from '@core/models/usuarios/usuario-model';
import { finalize, catchError, of } from 'rxjs';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './datos-personales.html',
  styleUrl: './datos-personales.scss'
})
export class DatosPersonalesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private clienteService = inject(ClienteService);

  datosForm!: FormGroup;
  isPhoneVerified: boolean = false;
  isSendingVerification: boolean = false; // Mantenemos por ahora, pero no se usa aquí
  isLoading: boolean = false;
  firebaseUid: string = '';

  // Lista de géneros (para el template)
  generos = ['HOMBRE', 'MUJER', 'OTRO'];

  ngOnInit(): void {
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

    this.loadUserData();
  }

  /**
   * Cargar datos del usuario desde Firebase + Backend
   */
  private loadUserData() {
    const currentUser = this.authService.getCurrentUser();
    const firebaseUser = this.authService.getFirebaseCurrentUser();

    if (!currentUser || !firebaseUser) {
      console.error('No hay usuario autenticado');
      return;
    }

    this.firebaseUid = currentUser.uid;

    // Cargar datos básicos de Firebase Auth
    const firebaseDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario';

    this.datosForm.patchValue({
      email: currentUser.email,
      nombreUsuario: firebaseDisplayName
    });

    // 🆕 Cargar datos del backend usando el nuevo endpoint
    this.cargarDatosDelBackend(firebaseDisplayName);
  }

  /**
  * 🆕 REFACTORIZADO: Cargar datos del backend
  * Usa GET /api/usuarios/perfil/{firebaseUid}
  */
  private cargarDatosDelBackend(firebaseDisplayName: string) {
    this.clienteService.obtenerPerfil(this.firebaseUid).subscribe({
      next: (clienteBackend) => {
        console.log('✅ Datos del backend cargados:', clienteBackend);

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
      },
      error: (error) => {
        console.error('❌ Error cargando datos del backend:', error);
        // Si el usuario no existe en backend (404), podría ser un usuario nuevo de Google
        if (error.status === 404) {
          console.warn('⚠️ Usuario no encontrado en backend, usar solo datos de Firebase');
        }
      }
    });
  }

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


  /**
   * 🆕 REFACTORIZADO: Guardar cambios
   * Ahora usa PUT /api/usuarios/perfil/{firebaseUid}
   */
  guardarCambios(): void {
    if (this.datosForm.invalid) {
      alert('Por favor, corrige los errores en el formulario.');
      this.markFormGroupTouched(this.datosForm);
      return;
    }

    this.isLoading = true;

    // Obtener valores del formulario (incluyendo los deshabilitados)
    const formData = this.datosForm.getRawValue();

    // Determinar el estado de verificación a enviar al backend
    // Si el teléfono está vacío, resetear la verificación a false
    const currentTelefono = formData.telefono;
    const telefonoVerificadoStatus = currentTelefono ? this.isPhoneVerified : false;

    // 🆕 Preparar request usando la nueva interfaz
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

    // 🆕 Guardar usando el nuevo endpoint PUT /api/usuarios/perfil/{uid}
    this.clienteService.actualizarPerfil(this.firebaseUid, request)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (usuario) => {
          console.log('✅ Datos guardados en backend:', usuario);
          alert('Datos personales guardados correctamente');
          // Si se eliminó el teléfono, el estado de verificación debe ser false
          this.isPhoneVerified = telefonoVerificadoStatus;
        },
        error: (error) => {
          console.error('❌ Error guardando datos:', error);
          const errorMessage = error.error?.mensaje || 'Error al guardar los datos. Por favor intenta nuevamente.';
          alert(errorMessage);
        }
      });
  }

  /**
   * Marcar todos los campos como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper para mostrar errores en el template
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.datosForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}