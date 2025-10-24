// src/app/components/panel-usuario/datos-personales/datos-personales.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '@core/services/auth/auth';
import { UsuarioBackendService } from '@core/services/usuarios/usuario-backend.service';
import { ActualizarUsuarioRequest } from '@core/models/usuarios/usuario-model';
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
  private usuarioBackendService = inject(UsuarioBackendService);

  datosForm!: FormGroup;
  isPhoneVerified: boolean = false;
  isSendingVerification: boolean = false;
  isLoading: boolean = false;
  firebaseUid: string = '';

  ngOnInit(): void {
    this.datosForm = this.fb.group({
      nombreUsuario: [{ value: '', disabled: true }, Validators.required],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      nacimiento: ['', [Validators.required, this.mayorDeEdadValidator]],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      prefijo: ['+51', [Validators.required, Validators.pattern(/^\+\d{1,3}$/)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
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
    this.usuarioBackendService.obtenerPerfil(this.firebaseUid).subscribe({
      next: (usuarioBackend) => {
        console.log('✅ Datos del backend cargados:', usuarioBackend);

        const nameParts = firebaseDisplayName.split(' ');
        const fallbackNombre = usuarioBackend.nombres || nameParts[0] || '';
        const fallbackApellido = usuarioBackend.apellidos || nameParts.slice(1).join(' ') || '';

        this.datosForm.patchValue({
          nombre: usuarioBackend.nombres || fallbackNombre,
          apellido: usuarioBackend.apellidos || fallbackApellido,
          nacimiento: usuarioBackend.fechaNacimiento || '',
          dni: usuarioBackend.numeroDocumento || '',
          prefijo: usuarioBackend.prefijoTelefono || '+51',
          telefono: usuarioBackend.telefono || ''
        });

        this.isPhoneVerified = usuarioBackend.telefonoVerificado;
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
   * 🆕 REFACTORIZADO: Enviar código de verificación
   */
  enviarCodigoVerificacion(): void {
    const telefono = this.datosForm.get('telefono')?.value;
    const prefijo = this.datosForm.get('prefijo')?.value;

    if (!telefono || !prefijo) {
      alert('Por favor ingresa un número de teléfono válido');
      return;
    }

    this.isSendingVerification = true;
    const phoneNumber = `${prefijo}${telefono}`;

    // TODO: Implementar verificación real con Firebase Phone Auth o servicio SMS
    setTimeout(() => {
      this.isSendingVerification = false;
      alert(`Código enviado a ${phoneNumber}. (Funcionalidad simulada)`);

      // 🆕 Marcar como verificado usando el nuevo endpoint
      this.usuarioBackendService.verificarTelefono(this.firebaseUid).subscribe({
        next: (usuario) => {
          this.isPhoneVerified = true;
          console.log('✅ Teléfono verificado en backend:', usuario);
        },
        error: (error) => {
          console.error('❌ Error verificando teléfono:', error);
          alert('Error al verificar el teléfono. Por favor intenta nuevamente.');
        }
      });
    }, 2000);
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

    if (!this.isPhoneVerified) {
      alert('Por favor, verifica tu número de teléfono antes de guardar.');
      return;
    }

    this.isLoading = true;

    // Obtener valores del formulario (incluyendo los deshabilitados)
    const formData = this.datosForm.getRawValue();

    // 🆕 Preparar request usando la nueva interfaz
    const request: ActualizarUsuarioRequest = {
      nombres: formData.nombre,
      apellidos: formData.apellido,
      tipoDocumento: 'DNI',
      numeroDocumento: formData.dni,
      fechaNacimiento: formData.nacimiento,
      prefijoTelefono: formData.prefijo,
      telefono: formData.telefono,
      telefonoVerificado: this.isPhoneVerified
    };

    // 🆕 Guardar usando el nuevo endpoint PUT /api/usuarios/perfil/{uid}
    this.usuarioBackendService.actualizarPerfil(this.firebaseUid, request)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (usuario) => {
          console.log('✅ Datos guardados en backend:', usuario);
          alert('Datos personales guardados correctamente');
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