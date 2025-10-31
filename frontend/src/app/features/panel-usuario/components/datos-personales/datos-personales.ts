import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
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
  generos = ['HOMBRE', 'MUJER', 'OTRO'];
  tipoDocumento = ['DNI', 'RUC', 'CARNET_EXTRANJERIA', 'PASAPORTE'];
  isPhoneVerified = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  public originalFormData: any = {};
  private destroy$ = new Subject<void>();
  private isInitialLoad = true;
  private hasUserInteracted = signal(false); // NUEVO: Para detectar interacción del usuario

  // ============================================================================
  // PREFIJOS TELEFÓNICOS
  // ============================================================================
  prefijosTelefonicos = [
    { codigo: '+51', pais: 'Perú', bandera: '🇵🇪' },
    { codigo: '+1', pais: 'Estados Unidos', bandera: '🇺🇸' },
    { codigo: '+34', pais: 'España', bandera: '🇪🇸' },
    { codigo: '+52', pais: 'México', bandera: '🇲🇽' },
    { codigo: '+54', pais: 'Argentina', bandera: '🇦🇷' },
    { codigo: '+55', pais: 'Brasil', bandera: '🇧🇷' },
    { codigo: '+56', pais: 'Chile', bandera: '🇨🇱' },
    { codigo: '+57', pais: 'Colombia', bandera: '🇨🇴' }
  ];

  // ============================================================================
  // CÁLCULOS DERIVADOS (computed signals)
  // ============================================================================

  /**
   * Determina si el botón de guardar debe estar habilitado
   * (Válido, con cambios y no guardando)
   */
  isSaveEnabled = computed(() => {
    const isValid = this.datosForm?.valid;
    const isDirty = this.isFormDirty();
    const isSaving = this.isSaving();

    console.log('🔘 Estado botón guardar:', {
      isValid,
      isDirty,
      isSaving,
      enabled: isValid && isDirty && !isSaving
    });

    return isValid && isDirty && !isSaving;
  });

  /**
   * Obtiene la etiqueta del campo de documento dinámicamente
   */
  documentoLabel = computed(() => {
    const tipo = this.datosForm?.get('tipoDocumento')?.value;
    switch (tipo) {
      case 'DNI': return 'Documento Nacional de Identidad (DNI)';
      case 'RUC': return 'Registro Único de Contribuyentes (RUC)';
      case 'CARNET_EXTRANJERIA': return 'Carnet de Extranjería';
      case 'PASAPORTE': return 'Pasaporte';
      default: return 'Número de Documento';
    }
  });

  /**
   * Obtiene la longitud máxima del campo de documento dinámicamente
   */
  documentoMaxLength = computed(() => {
    const tipo = this.datosForm?.get('tipoDocumento')?.value;
    switch (tipo) {
      case 'DNI': return 8;
      case 'RUC': return 11;
      case 'CARNET_EXTRANJERIA': return 15;
      case 'PASAPORTE': return 15;
      default: return 8;
    }
  });

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.initializeForm();
    this.setupTipoDocumentoListener();
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
   * Inicializar formulario - SIN validators en campos deshabilitados
   */
  private initializeForm(): void {
    this.datosForm = this.fb.group({
      nombreUsuario: [{ value: '', disabled: true }],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      nacimiento: ['', [Validators.required, this.mayorDeEdadValidator]],
      tipoDocumento: ['DNI', Validators.required],
      dni: ['', [Validators.required]],
      prefijoTelefono: ['+51'],
      telefono: ['', [Validators.pattern(/^\d{9,15}$/)]],
      email: [{ value: '', disabled: true }],
      genero: ['', Validators.required]
    });

    // ESCUCHAR CAMBIOS EN EL FORMULARIO para detectar interacción del usuario
    this.datosForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isInitialLoad) {
          this.hasUserInteracted.set(true);
        }
      });
  }

  /**
   * Configura un listener para ajustar validaciones de documento cuando cambia el tipo.
   */
  private setupTipoDocumentoListener(): void {
    this.datosForm.get('tipoDocumento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipo => {
        this.actualizarValidadoresDocumento(tipo);
      });
  }

  /**
   * Actualiza validadores del campo documento basado en el tipo
   */
  private actualizarValidadoresDocumento(tipo: string): void {
    const dniControl = this.datosForm.get('dni');
    if (!dniControl) return;

    // Limpiar validadores existentes
    dniControl.clearValidators();

    switch (tipo) {
      case 'DNI':
        dniControl.setValidators([
          Validators.required,
          Validators.pattern(/^[0-9]{8}$/)
        ]);
        break;
      case 'RUC':
        dniControl.setValidators([
          Validators.required,
          Validators.pattern(/^[0-9]{11}$/)
        ]);
        break;
      case 'CARNET_EXTRANJERIA':
      case 'PASAPORTE':
        dniControl.setValidators([
          Validators.required,
          Validators.pattern(/^[0-9A-Z]{5,15}$/)
        ]);
        break;
      default:
        dniControl.setValidators([Validators.required]);
    }

    dniControl.updateValueAndValidity();
  }

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  private loadUserData(): void {
    this.isInitialLoad = true;
    this.hasUserInteracted.set(false);

    this.authService.getCurrentUser$().pipe(
      takeUntil(this.destroy$),
      tap(currentUser => {
        if (!currentUser || !currentUser.email) {
          console.error('No hay usuario autenticado o email no disponible');
          return;
        }

        console.log('👤 Usuario cargado:', currentUser);
        const authEmail = currentUser.email;

        const displayUsername = currentUser.username ||
          authEmail.split('@')[0] ||
          'Usuario';

        this.datosForm.patchValue({
          email: authEmail,
          nombreUsuario: displayUsername
        });
      }),
      switchMap(currentUser => {
        if (!currentUser || !currentUser.email) {
          throw new Error('Email de usuario no autenticado para cargar datos.');
        }

        const authEmail = currentUser.email;
        return this.cargarDatosDelBackend(authEmail);
      })
    ).subscribe({
      next: () => {
        console.log('✅ Datos del usuario cargados completamente');

        // Actualizar validadores después de cargar datos
        const tipoDoc = this.datosForm.get('tipoDocumento')?.value;
        if (tipoDoc) {
          this.actualizarValidadoresDocumento(tipoDoc);
        }

        // Inicializar datos originales - IMPORTANTE: después de cargar todo
        this.originalFormData = { ...this.datosForm.getRawValue() };

        console.log('📋 Datos originales guardados:', this.originalFormData);

        this.isInitialLoad = false;

        // Forzar actualización de validación
        setTimeout(() => {
          this.datosForm.updateValueAndValidity();
          this.logEstadoFormulario();
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error cargando datos del usuario:', error);
        this.isInitialLoad = false;
        this.errorMessage.set('Error al cargar tus datos. Por favor recarga la página.');
      }
    });
  }

  /**
   * Verifica si el formulario tiene cambios comparado con los datos originales.
   * MEJORADO: Maneja perfiles vacíos y datos iniciales
   */
  isFormDirty(): boolean {
    if (!this.datosForm || this.isInitialLoad || !this.hasUserInteracted()) {
      return false;
    }

    const currentData = this.datosForm.getRawValue();
    let hasChanges = false;

    // Para perfiles vacíos, considerar que hay cambios si al menos un campo requerido tiene datos
    const isProfileEmpty = this.isProfileEmpty(this.originalFormData);

    if (isProfileEmpty) {
      // Si el perfil original está vacío, hay cambios si al menos un campo requerido tiene datos
      const requiredFields = ['nombre', 'apellido', 'nacimiento', 'dni', 'genero'];
      hasChanges = requiredFields.some(field => {
        const currentValue = currentData[field];
        return currentValue && currentValue.toString().trim().length > 0;
      });

      console.log('📝 Perfil vacío - isFormDirty:', hasChanges);
      return hasChanges;
    }

    // Para perfiles existentes, comparar normalmente
    for (const key in currentData) {
      if (key === 'nombreUsuario' || key === 'email') {
        continue;
      }

      const currentValue = this.normalizarParaComparacion(currentData[key]);
      const originalValue = this.normalizarParaComparacion(this.originalFormData[key]);

      if (currentValue !== originalValue) {
        console.log(`🔄 Campo ${key} cambió:`, {
          original: originalValue,
          current: currentValue
        });
        hasChanges = true;
      }
    }

    console.log('📝 isFormDirty:', hasChanges);
    return hasChanges;
  }

  /**
   * Verifica si el perfil está vacío (datos iniciales)
   */
  public isProfileEmpty(profileData: any): boolean {
    const fieldsToCheck = ['nombre', 'apellido', 'nacimiento', 'dni', 'genero'];
    return fieldsToCheck.every(field => {
      const value = profileData[field];
      return !value || value.toString().trim().length === 0;
    });
  }

  /**
   * Normaliza valores para comparación
   */
  private normalizarParaComparacion(valor: any): string {
    if (valor === null || valor === undefined || valor === 'null' || valor === 'undefined') {
      return '';
    }
    return String(valor).trim();
  }

  /**
   * Carga los datos extendidos del perfil desde el backend usando el email.
   */
  private cargarDatosDelBackend(email: string) {
    return this.clienteService.obtenerPerfil(email).pipe(
      tap(clienteBackend => {
        console.log('📂 Datos del backend cargados:', clienteBackend);

        // Normalizar datos del backend
        const nombres = this.normalizarValor(clienteBackend.nombres);
        const apellidos = this.normalizarValor(clienteBackend.apellidos);
        const fechaNacimiento = this.normalizarValor(clienteBackend.fechaNacimiento?.split('T')[0]);
        const tipoDocumento = this.normalizarValor(clienteBackend.tipoDocumento, 'DNI');
        const numeroDocumento = this.normalizarValor(clienteBackend.numeroDocumento);
        const prefijoTelefono = this.normalizarValor(clienteBackend.prefijoTelefono, '+51');
        const telefono = this.normalizarValor(clienteBackend.telefono);
        const genero = this.normalizarValor(clienteBackend.genero);

        console.log('📋 Datos normalizados para formulario:', {
          nombres, apellidos, fechaNacimiento, tipoDocumento,
          numeroDocumento, prefijoTelefono, telefono, genero
        });

        // Hacer patchValue de manera controlada
        this.datosForm.patchValue({
          nombre: nombres,
          apellido: apellidos,
          nacimiento: fechaNacimiento,
          tipoDocumento: tipoDocumento,
          dni: numeroDocumento,
          prefijoTelefono: prefijoTelefono,
          telefono: telefono,
          genero: genero
        }, { emitEvent: false });

        this.isPhoneVerified.set(clienteBackend.telefonoVerificado || false);
      })
    );
  }

  /**
   * Normaliza valores para el formulario
   */
  private normalizarValor(valor: any, valorPorDefecto: string = ''): string {
    if (valor === null || valor === undefined || valor === 'null' || valor === 'undefined') {
      return valorPorDefecto;
    }
    return String(valor).trim();
  }

  // ============================================================================
  // VALIDADORES
  // ============================================================================

  /**
   * Validador personalizado para la edad
   */
  mayorDeEdadValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return { required: true };

    const birthDate = new Date(control.value);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
      return { invalidDate: true };
    }

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

  guardarCambios(): void {
    this.clearMessages();

    console.log('💾 === INTENTANDO GUARDAR ===');
    console.log('Formulario válido:', this.datosForm.valid);
    console.log('Formulario dirty:', this.isFormDirty());
    console.log('isSaving:', this.isSaving());

    // Marcar todos los campos como touched para mostrar errores
    this.markFormGroupTouched(this.datosForm);

    if (this.datosForm.invalid) {
      console.log('❌ Formulario inválido, mostrando errores');
      this.logErroresFormulario();
      this.errorMessage.set('Por favor, completa todos los campos requeridos correctamente.');
      return;
    }

    if (!this.isFormDirty()) {
      this.errorMessage.set('No hay cambios para guardar.');
      return;
    }

    this.isSaving.set(true);
    const formData = this.datosForm.getRawValue();
    const userEmail = formData.email;

    if (!userEmail) {
      this.isSaving.set(false);
      this.errorMessage.set('Error de autenticación.');
      return;
    }

    const request: ActualizarClienteRequest = {
      nombres: formData.nombre,
      apellidos: formData.apellido,
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: formData.dni,
      fechaNacimiento: formData.nacimiento,
      prefijoTelefono: formData.prefijoTelefono,
      telefono: formData.telefono || null,
      telefonoVerificado: this.isPhoneVerified(),
      genero: formData.genero
    };

    console.log('📤 Enviando datos al backend:', request);

    this.clienteService.actualizarPerfil(userEmail, request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.successMessage.set('✅ Datos guardados correctamente.');
          // Actualizar datos originales después de guardar
          this.originalFormData = { ...this.datosForm.getRawValue() };
          this.hasUserInteracted.set(false);

          setTimeout(() => this.clearMessages(), 5000);
        },
        error: (error) => {
          console.error('❌ Error al guardar:', error);
          this.errorMessage.set(error.message || 'Error al guardar los datos');
          setTimeout(() => this.clearMessages(), 5000);
        }
      });
  }

  // ============================================================================
  // HELPERS PARA VALIDACIÓN Y UI
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
   * Verifica si un campo es inválido
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.datosForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Verifica si un campo es válido y ha sido interactuado
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.datosForm.get(fieldName);
    return !!(field && field.valid && (field.dirty || field.touched));
  }

  /**
   * Marca un campo como touched para mostrar errores inmediatamente
   */
  onFieldBlur(fieldName: string): void {
    const field = this.datosForm.get(fieldName);
    if (field) {
      field.markAsTouched();
    }
  }

  /**
   * Maneja el cambio en campos para mostrar errores en tiempo real
   */
  onFieldInput(fieldName: string): void {
    const field = this.datosForm.get(fieldName);
    if (field) {
      field.markAsDirty();
      if (fieldName === 'tipoDocumento') {
        const dniControl = this.datosForm.get('dni');
        dniControl?.updateValueAndValidity();
      }
    }
  }

  /**
   * Obtiene el mensaje de error específico para cada campo
   */
  getFieldError(fieldName: string): string {
    const field = this.datosForm.get(fieldName);

    if (!field || !field.errors || (!field.dirty && !field.touched)) {
      return '';
    }

    const errors = field.errors;

    if (errors['required']) {
      return 'Este campo es requerido';
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['pattern']) {
      switch (fieldName) {
        case 'dni':
          const tipoDoc = this.datosForm.get('tipoDocumento')?.value;
          switch (tipoDoc) {
            case 'DNI': return 'El DNI debe tener 8 dígitos';
            case 'RUC': return 'El RUC debe tener 11 dígitos';
            case 'CARNET_EXTRANJERIA':
            case 'PASAPORTE': return 'Debe tener entre 5 y 15 caracteres alfanuméricos';
            default: return 'Formato inválido';
          }
        case 'telefono': return 'El teléfono debe tener entre 9 y 15 dígitos';
        default: return 'Formato inválido';
      }
    }

    if (errors['email']) return 'Email inválido';
    if (errors['menorDeEdad']) return 'Debes ser mayor de 18 años';
    if (errors['invalidDate']) return 'Fecha inválida';

    return 'Error en el campo';
  }

  /**
   * Log del estado del formulario para debug
   */
  private logEstadoFormulario(): void {
    console.log('📊 === ESTADO ACTUAL DEL FORMULARIO ===');
    console.log('Formulario válido:', this.datosForm.valid);
    console.log('Formulario dirty:', this.datosForm.dirty);
    console.log('Formulario touched:', this.datosForm.touched);
    console.log('Has user interacted:', this.hasUserInteracted());

    Object.keys(this.datosForm.controls).forEach(key => {
      const control = this.datosForm.get(key);
      console.log(`📋 ${key}:`, {
        valor: control?.value,
        válido: control?.valid,
        inválido: control?.invalid,
        dirty: control?.dirty,
        touched: control?.touched,
        errores: control?.errors
      });
    });
  }

  /**
   * Log de errores del formulario
   */
  private logErroresFormulario(): void {
    console.log('❌ === ERRORES DETALLADOS DEL FORMULARIO ===');
    Object.keys(this.datosForm.controls).forEach(key => {
      const control = this.datosForm.get(key);
      if (control?.invalid) {
        console.log(`🔴 ${key}:`, control.errors);
      }
    });
  }

  /**
   * Limpiar mensajes
   */
  public clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}