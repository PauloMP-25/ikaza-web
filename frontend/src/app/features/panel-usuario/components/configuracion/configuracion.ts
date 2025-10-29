// src/app/features/configuracion/configuracion.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, finalize, switchMap, takeUntil, tap } from 'rxjs';

// Servicios
import { AuthService } from '@core/services/auth/auth';
import { ProfileService } from '@core/services/clientes/servicio-perfil.service';
import { PasswordService } from '@core/services/auth/password.service';
import { VerificationService } from '@core/services/auth/verificacion.service';
import { ClienteService } from '@core/services/clientes/cliente.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.scss']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private passwordService = inject(PasswordService);
  private verificationService = inject(VerificationService);
  private clienteService = inject(ClienteService);

  // ============================================================================
  // FORMULARIOS
  // ============================================================================
  perfilForm!: FormGroup;
  passwordForm!: FormGroup;
  emailVerificationForm!: FormGroup;
  phoneVerificationForm!: FormGroup;

  // ============================================================================
  // ESTADO DE VERIFICACIONES
  // ============================================================================
  isEmailVerified: boolean = false;
  isPhoneVerified: boolean = false;
  emailCodeSent: boolean = false;
  phoneCodeSent: boolean = false;

  // ============================================================================
  // ESTADO DE CARGA
  // ============================================================================
  isLoadingPassword: boolean = false;
  isLoadingProfile: boolean = false;
  isLoadingAvatar: boolean = false;
  isSendingEmailCode: boolean = false;
  isSendingPhoneCode: boolean = false;
  isVerifyingEmail: boolean = false;
  isVerifyingPhone: boolean = false;

  // ============================================================================
  // ESTADO DEL AVATAR
  // ============================================================================
  selectedIcon: string = 'bi-person-circle';
  profileImage: string | null = null;
  private originalIcon: string = 'bi-person-circle';
  private originalImage: string | null = null;
  private originalDisplayName: string = '';

  // ============================================================================
  // DATOS DEL USUARIO
  // ============================================================================
  private userEmail: string = '';
  public userPhone: string = '';

  // ============================================================================
  // ICONOS DISPONIBLES
  // ============================================================================
  availableIcons = [
    { class: 'bi-person-circle', name: 'Persona' },
    { class: 'bi-person-fill', name: 'Usuario' },
    { class: 'bi-person-heart', name: 'Corazón' },
    { class: 'bi-person-check', name: 'Verificado' },
    { class: 'bi-emoji-smile', name: 'Sonrisa' },
    { class: 'bi-emoji-sunglasses', name: 'Genial' },
    { class: 'bi-star-fill', name: 'Estrella' },
    { class: 'bi-heart-fill', name: 'Corazón lleno' },
    { class: 'bi-lightning-fill', name: 'Rayo' },
    { class: 'bi-gem', name: 'Diamante' },
    { class: 'bi-camera-fill', name: 'Cámara' },
    { class: 'bi-music-note', name: 'Música' }
  ];

  // ============================================================================
  // SUBJECT PARA LIMPIAR SUBSCRIPTIONS
  // ============================================================================
  private destroy$ = new Subject<void>();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  constructor() {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Inicializar formularios
   */
  private initializeForms(): void {
    // Formulario de perfil
    this.perfilForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });

    // Formulario de contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Formulario de verificación de email
    this.emailVerificationForm = this.fb.group({
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    // Formulario de verificación de teléfono
    this.phoneVerificationForm = this.fb.group({
      telefonoCompleto: [{ value: '', disabled: true }],
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  /**
   * Cargar datos del usuario
   */
  private loadUserData(): void {
    this.authService.getCurrentUser$().pipe(
      takeUntil(this.destroy$),
      tap(currentUser => {
        if (!currentUser) {
          console.error('No hay usuario autenticado');
          return;
        }

        console.log('Usuario cargado:', currentUser);
        this.userEmail = currentUser.email;

        // Cargar displayName del email
        const displayName = currentUser.email.split('@')[0];
        this.perfilForm.patchValue({ displayName });
        this.originalDisplayName = displayName;

        // Cargar foto/icono
        if (currentUser.photoURL) {
          this.profileImage = currentUser.photoURL;
          this.originalImage = currentUser.photoURL;
        }
        if (currentUser.customIcon) {
          this.selectedIcon = currentUser.customIcon;
          this.originalIcon = currentUser.customIcon;
        }
      }),
      // Cargar datos del cliente desde el backend
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No hay usuario autenticado');
        }
        return this.clienteService.obtenerPerfil(currentUser.email);
      })
    ).subscribe({
      next: (cliente) => {
        console.log('Datos del cliente cargados:', cliente);

        // Cargar estado de verificaciones
        this.isEmailVerified = cliente.activo; // Asumiendo que activo implica email verificado
        this.isPhoneVerified = cliente.telefonoVerificado;

        // Cargar teléfono
        const telefonoCompleto = `${cliente.prefijoTelefono || ''}${cliente.telefono || ''}`;
        this.userPhone = telefonoCompleto;
        this.phoneVerificationForm.patchValue({ telefonoCompleto });
      },
      error: (error) => {
        console.error('Error cargando datos del usuario:', error);
      }
    });
  }

  // ============================================================================
  // VERIFICACIÓN DE EMAIL
  // ============================================================================

  /**
   * Enviar código de verificación por email
   */
  sendEmailVerificationCode(): void {
    this.isSendingEmailCode = true;
    this.emailCodeSent = false;

    this.verificationService.sendEmailVerificationCode(this.userEmail)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSendingEmailCode = false)
      )
      .subscribe({
        next: (response) => {
          this.emailCodeSent = true;
          alert('Código de verificación enviado a tu email. Revisa tu bandeja de entrada.');
        },
        error: (error) => {
          alert(error.message);
        }
      });
  }

  /**
   * Verificar código de email
   */
  verifyEmailCode(): void {
    if (this.emailVerificationForm.invalid || !this.emailCodeSent) {
      alert('Por favor, ingresa el código de 6 dígitos.');
      return;
    }

    const code = this.emailVerificationForm.get('verificationCode')?.value;
    this.isVerifyingEmail = true;

    this.verificationService.verifyEmailCode(this.userEmail, code)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isVerifyingEmail = false)
      )
      .subscribe({
        next: () => {
          this.isEmailVerified = true;
          this.emailCodeSent = false;
          this.emailVerificationForm.reset();
          alert('¡Email verificado correctamente!');
        },
        error: (error) => {
          alert(error.message);
        }
      });
  }

  // ============================================================================
  // VERIFICACIÓN DE TELÉFONO
  // ============================================================================

  /**
   * Enviar código de verificación por SMS
   */
  sendPhoneVerificationCode(): void {
    const telefonoInfo = this.phoneVerificationForm.getRawValue();
    const telefono = telefonoInfo.telefonoCompleto;

    if (!telefono || telefono.length < 10) {
      alert('Error: El número de teléfono no ha sido guardado en "Datos Personales".');
      return;
    }

    this.isSendingPhoneCode = true;
    this.phoneCodeSent = false;

    this.verificationService.sendPhoneVerificationCode(telefono)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSendingPhoneCode = false)
      )
      .subscribe({
        next: (response) => {
          this.phoneCodeSent = true;
          alert('Código SMS enviado. Revisa tu teléfono.');
        },
        error: (error) => {
          alert(error.message);
        }
      });
  }

  /**
   * Verificar código de teléfono
   */
  verifyPhoneCode(): void {
    if (this.phoneVerificationForm.invalid || !this.phoneCodeSent) {
      alert('Por favor, ingresa el código de 6 dígitos.');
      return;
    }

    const code = this.phoneVerificationForm.get('verificationCode')?.value;
    this.isVerifyingPhone = true;

    this.verificationService.verifyPhoneCode(this.userEmail, this.userPhone, code)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isVerifyingPhone = false)
      )
      .subscribe({
        next: () => {
          this.isPhoneVerified = true;
          this.phoneCodeSent = false;
          this.phoneVerificationForm.get('verificationCode')?.reset();
          alert('¡Teléfono verificado correctamente!');
        },
        error: (error) => {
          alert(error.message);
        }
      });
  }

  // ============================================================================
  // GESTIÓN DE AVATAR
  // ============================================================================

  /**
   * Seleccionar icono
   */
  selectIcon(iconClass: string): void {
    this.selectedIcon = iconClass;
  }

  /**
   * Manejar selección de imagen
   */
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede ser mayor a 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.profileImage = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Eliminar imagen de perfil
   */
  removeProfileImage(): void {
    this.profileImage = null;
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Verificar cambios en el avatar
   */
  hasAvatarChanges(): boolean {
    const imageChanged = this.profileImage !== this.originalImage;
    const iconChanged = this.selectedIcon !== this.originalIcon;
    return imageChanged || iconChanged;
  }

  /**
   * Guardar avatar
   */
  guardarAvatar(): void {
    if (!this.hasAvatarChanges()) {
      return;
    }

    this.isLoadingAvatar = true;

    this.profileService.updateProfile(this.userEmail, {
      photoURL: this.profileImage,
      customIcon: this.profileImage ? null : this.selectedIcon
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingAvatar = false)
      )
      .subscribe({
        next: () => {
          this.originalImage = this.profileImage;
          this.originalIcon = this.selectedIcon;
          alert('Avatar actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar avatar:', error);
          alert('Error al actualizar el avatar. Por favor intenta nuevamente.');
        }
      });
  }

  // ============================================================================
  // GESTIÓN DE PERFIL
  // ============================================================================

  /**
   * Guardar perfil
   */
  guardarPerfil(): void {
    if (!this.perfilForm.valid) {
      return;
    }

    const formData = this.perfilForm.value;
    const displayNameChanged = formData.displayName !== this.originalDisplayName;

    if (!displayNameChanged) {
      return;
    }

    this.isLoadingProfile = true;

    this.profileService.updateProfile(this.userEmail, {
      displayName: formData.displayName
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingProfile = false)
      )
      .subscribe({
        next: () => {
          this.originalDisplayName = formData.displayName;
          alert('Perfil actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar perfil:', error);
          alert('Error al actualizar el perfil. Por favor intenta nuevamente.');
        }
      });
  }

  // ============================================================================
  // GESTIÓN DE CONTRASEÑA
  // ============================================================================

  /**
   * Cambiar contraseña
   */
  cambiarPassword(): void {
    if (!this.passwordForm.valid) {
      return;
    }

    this.isLoadingPassword = true;
    const formData = this.passwordForm.value;

    this.passwordService.changePassword(
      formData.currentPassword,
      formData.newPassword
    )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingPassword = false)
      )
      .subscribe({
        next: () => {
          alert('Contraseña cambiada correctamente');
          this.passwordForm.reset();
        },
        error: (error) => {
          alert(error.message);
        }
      });
  }

  // ============================================================================
  // VALIDADORES
  // ============================================================================

  /**
   * Validador de contraseñas coincidentes
   */
  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // ============================================================================
  // HELPERS PARA TEMPLATE
  // ============================================================================

  /**
   * Verificar si un campo es inválido
   */
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtener error de un campo
   */
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }
}