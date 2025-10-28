import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth/auth';
import { ProfileService } from '@core/services/clientes/servicio-perfil.service';
import { PasswordService } from '@core/services/auth/service-password';
import { ProfileUpdateData } from '@core/models/auth-firebase/profile-update-data';
import { ClienteService } from '@core/services/clientes/cliente.service';
import { RecaptchaVerifier, Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss'
})
export class ConfiguracionComponent implements OnInit {

  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private passwordService = inject(PasswordService);
  private clienteService = inject(ClienteService);
  private firebaseAuthInstance = inject(Auth);

  // ============================================================================
  // FORMULARIOS
  // ============================================================================
  perfilForm!: FormGroup;
  passwordForm!: FormGroup;
  phoneVerificationForm!: FormGroup;

  // ============================================================================
  // ESTADO DE VERIFICACIONES
  // ============================================================================
  isEmailVerified: boolean = true;
  isPhoneVerified: boolean = false;
  isSendingVerificationCode: boolean = false;
  verificationCodeSent: boolean = false;
  isSendingEmail: boolean = false;
  isLoadingVerification: boolean = false;

  // ============================================================================
  // ESTADO DE CARGA
  // ============================================================================
  isLoadingPassword: boolean = false;
  isLoadingProfile: boolean = false;
  isLoadingAvatar: boolean = false;

  // ============================================================================
  // ESTADO DEL AVATAR
  // ============================================================================
  selectedIcon: string = 'bi-person-circle';
  profileImage: string | null = null;
  private originalIcon: string = 'bi-person-circle';
  private originalImage: string | null = null;
  private originalDisplayName: string = '';
  private firebaseUid: string = '';

  // ============================================================================
  // RECAPTCHA
  // ============================================================================
  windowRef: any;
  recaptchaVerifier!: RecaptchaVerifier;

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
  // CONSTRUCTOR
  // ============================================================================
  constructor() {
    this.initializeForms();
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit() {
    this.windowRef = (window as any);
    this.setupRecaptcha();
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
   * Inicializar todos los formularios
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

    // Formulario de verificación de teléfono
    this.phoneVerificationForm = this.fb.group({
      telefonoCompleto: [{ value: '', disabled: true }],
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  /**
   * Configura el reCAPTCHA invisible (requerido por Firebase Phone Auth)
   */
  private setupRecaptcha(): void {
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.firebaseAuthInstance,
      'recaptcha-container',
      { size: 'invisible' }
    );
    this.recaptchaVerifier.render();
  }

  // ===============================
  // CARGA DE DATOS
  // ===============================

  /**
   * Cargar datos del usuario de forma REACTIVA
   * - Un solo flujo reactivo que carga todo
   * - Se actualiza automáticamente si el usuario cambia
   * - Manejo robusto de errores
   * - Sin memory leaks
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
        this.firebaseUid = currentUser.uid;

        // Cargar estado de verificación de email
        this.isEmailVerified = currentUser.emailVerified;

        // Cargar displayName
        const displayName = currentUser.displayName || '';
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
      // Cargar estado del teléfono desde el backend
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('No hay usuario autenticado');
        }
        return this.cargarEstadoTelefono(currentUser.uid);
      })
    ).subscribe({
      next: () => {
        console.log('Datos del usuario cargados completamente');
      },
      error: (error) => {
        console.error('Error cargando datos del usuario:', error);
      }
    });
  }

  /**
   * Cargar estado del teléfono
   * - Retorna Observable para integrarse con el flujo reactivo
   * - Usa tap() para efectos secundarios
   * - Maneja error 404 sin romper el flujo
   */
  private cargarEstadoTelefono(firebaseUid: string) {
    return this.clienteService.obtenerPerfil(firebaseUid).pipe(
      tap(cliente => {
        console.log('Estado del teléfono cargado:', cliente.telefonoVerificado);
        this.isPhoneVerified = cliente.telefonoVerificado;
        const telefonoCompleto = `${cliente.prefijoTelefono || ''}${cliente.telefono || ''}`;
        this.phoneVerificationForm.patchValue({ telefonoCompleto });
      }),
      // No propagar error 404 porque es normal si no hay teléfono
      finalize(() => { })
    );
  }



  // ============================================================================
  // VERIFICACIÓN DE TELÉFONO
  // ============================================================================

  /**
   * PASO 1: Envía el código SMS usando Firebase Phone Auth
   */
  requestVerificationCode(): void {
    const telefonoInfo = this.phoneVerificationForm.getRawValue();
    const telefonoGuardado = telefonoInfo.telefonoCompleto;

    if (!telefonoGuardado || telefonoGuardado.length < 10) {
      alert('Error: El número de teléfono no ha sido guardado en "Datos Personales".');
      return;
    }

    this.isSendingVerificationCode = true;
    this.verificationCodeSent = false;

    this.authService.sendSmsCode(telefonoGuardado, this.recaptchaVerifier)
      .pipe(
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
        finalize(() => this.isSendingVerificationCode = false)
      )
      .subscribe({
        next: () => {
          this.verificationCodeSent = true;
          alert('Código SMS enviado. Revisa tu teléfono.');
        },
        error: (error) => {
          console.error('❌ Error enviando SMS:', error);
          alert(`Error al enviar el código: ${error.message || 'Intenta de nuevo.'}`);
          this.verificationCodeSent = false;
        }
      });
  }

  /**
   * PASO 2: Valida el código con Firebase y actualiza el backend
   */
  verifyPhoneNumber(): void {
    if (this.phoneVerificationForm.invalid || !this.verificationCodeSent) {
      alert('Por favor, ingresa el código de 6 dígitos.');
      return;
    }

    const codigo = this.phoneVerificationForm.get('verificationCode')?.value;
    this.isLoadingVerification = true;

    this.authService.verifySmsCode(codigo)
      .pipe(
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
        switchMap(() => this.clienteService.verificarTelefono(this.firebaseUid)),
        finalize(() => this.isLoadingVerification = false)
      )
      .subscribe({
        next: (cliente) => {
          this.isPhoneVerified = true;
          alert('¡Teléfono verificado correctamente!');
          // Refrescar usuario
          this.authService.refreshUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        },
        error: (error) => {
          console.error('Error en verificación/backend:', error);
          alert(`Error de verificación: ${error.message || 'Código incorrecto o expirado.'}`);
        }
      });
  }

  // ============================================================================
  // VERIFICACIÓN DE EMAIL
  // ============================================================================

  /**
   * Envía el correo de verificación
   */
  sendEmailVerification(): void {
    this.isSendingEmail = true;

    this.authService.sendVerificationEmail()
      .pipe(
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
        finalize(() => this.isSendingEmail = false)
      )
      .subscribe({
        next: () => {
          alert('Correo de verificación enviado exitosamente. Revisa tu bandeja de entrada.');
        },
        error: (error) => {
          alert(`Error: ${error.message}`);
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

    // Validar tipo de archivo
    if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    // Validar tamaño (máximo 5MB)
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
   * Verificar si hay cambios en el avatar
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

    this.profileService.updateProfile({
      photoURL: this.profileImage,
      customIcon: this.profileImage ? null : this.selectedIcon
    } as ProfileUpdateData)
      .pipe(
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
        switchMap(() => this.authService.refreshUser()), //Refrescar estado
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

    this.isLoadingProfile = true;
    const formData = this.perfilForm.value;

    // Verificar si el displayName cambió
    const displayNameChanged = formData.displayName !== this.originalDisplayName;
    if (!displayNameChanged) {
      this.isLoadingProfile = false;
      return;
    }

    this.profileService.updateProfile({
      displayName: formData.displayName
    } as ProfileUpdateData)
      .pipe(
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
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
   * Cambiar contraseña (ahora usa subscribe correctamente)
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
        takeUntil(this.destroy$), //Limpiar si el componente se destruye
        finalize(() => this.isLoadingPassword = false)
      )
      .subscribe({
        next: () => {
          alert('Contraseña cambiada correctamente');
          this.passwordForm.reset();
        },
        error: (error: any) => {
          console.error('Error al cambiar contraseña:', error);

          let errorMessage = 'Error al cambiar la contraseña. Por favor intenta nuevamente.';

          if (error.code === 'auth/wrong-password') {
            errorMessage = 'La contraseña actual es incorrecta.';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La nueva contraseña es muy débil.';
          } else if (error.message) {
            errorMessage = error.message;
          }

          alert(errorMessage);
        }
      });
  }

  // ============================================================================
  // VALIDADORES
  // ============================================================================

  /**
   * Validador personalizado para confirmar contraseña
   */
  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // ============================================================================
  // HELPERS PARA EL TEMPLATE
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