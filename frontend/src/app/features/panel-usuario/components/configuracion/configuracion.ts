import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth/auth';
import { ProfileService } from '@core/services/clientes/servicio-perfil.service';
import { PasswordService } from '@core/services/auth/service-password';
import { ProfileUpdateData } from '@core/models/auth-firebase/profile-update-data'; // Usaremos esta interfaz
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

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private passwordService = inject(PasswordService);
  private clienteService = inject(ClienteService);
  private firebaseAuthInstance = inject(Auth);

  // Formularios reactivos
  perfilForm!: FormGroup; // Cambio a non-null assertion para alinearse con ngOnInit
  passwordForm!: FormGroup; // Cambio a non-null assertion
  phoneVerificationForm: FormGroup;

  windowRef: any; // Referencia global a la ventana
  recaptchaVerifier!: RecaptchaVerifier; // Instancia del verificador
  // 🆕 ESTADOS DE VERIFICACIÓN
  isEmailVerified: boolean = true; // Estado real de Firebase
  isPhoneVerified: boolean = false; // Estado del backend
  isSendingVerificationCode: boolean = false;
  verificationCodeSent: boolean = false;
  isSendingEmail: boolean = false;
  isLoadingVerification: boolean = false;

  // Variables para manejo de estado
  selectedIcon: string = 'bi-person-circle';
  profileImage: string | null = null;
  isLoadingPassword: boolean = false;
  isLoadingProfile: boolean = false;
  isLoadingAvatar: boolean = false;

  // Variables para tracking de cambios en avatar
  private originalIcon: string = 'bi-person-circle';
  private originalImage: string | null = null;
  private originalDisplayName: string = '';
  private firebaseUid: string = '';


  // Iconos disponibles de Bootstrap Icons
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

  constructor() {
    this.perfilForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });

    // Formulario para cambio de contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.phoneVerificationForm = this.fb.group({
      telefonoCompleto: [{ value: '', disabled: true }], // Solo lectura/referencia
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    this.availableIcons = [
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
  }

  ngOnInit() {
    this.windowRef = (window as any); // Obtener referencia a la ventana global
    this.setupRecaptcha(); // 🆕 Inicializar reCAPTCHA
    this.loadUserData();
  }

  /**
     * 🆕 Configura el reCAPTCHA invisible (requerido por Firebase Phone Auth)
     */
  private setupRecaptcha(): void {
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.firebaseAuthInstance, // <--- Pasar la instancia de Auth inyectada
      'recaptcha-container',      // ID del contenedor 
      { size: 'invisible' }
    );
    this.recaptchaVerifier.render();
  }

  // ===============================================
  // LÓGICA DE VERIFICACIÓN DE TELÉFONO (FUNCIONAL)
  // ===============================================

  /**
   * 🆕 PASO 1: Envía el código SMS usando Firebase Phone Auth.
   */
  requestVerificationCode(): void {
    const telefonoInfo = this.phoneVerificationForm.getRawValue();
    const telefonoGuardado = telefonoInfo.telefonoCompleto;

    // Comprobar si el número está guardado antes de enviar el código
    if (!telefonoGuardado || telefonoGuardado.length < 10) {
      alert('❌ Error: El número de teléfono no ha sido guardado en "Datos Personales".');
      return;
    }

    this.isSendingVerificationCode = true;
    this.verificationCodeSent = false;

    // La URL de Firebase ya está configurada; usamos el servicio
    this.authService.sendSmsCode(telefonoGuardado, this.recaptchaVerifier)
      .pipe(finalize(() => this.isSendingVerificationCode = false))
      .subscribe({
        next: () => {
          this.verificationCodeSent = true;
          alert('✅ Código SMS enviado. Revisa tu teléfono.');
        },
        error: (error) => {
          console.error('❌ Error enviando SMS:', error);
          alert(`❌ Error al enviar el código: ${error.message || 'Intenta de nuevo.'}`);
          this.verificationCodeSent = false;
        }
      });
  }

  /**
   * 🆕 PASO 2: Valida el código con Firebase y actualiza el backend.
   */
  verifyPhoneNumber(): void {
    if (this.phoneVerificationForm.invalid || !this.verificationCodeSent) {
      alert('Por favor, ingresa el código de 6 dígitos.');
      return;
    }

    const codigo = this.phoneVerificationForm.get('verificationCode')?.value;
    this.isLoadingVerification = true;

    // 1. Verificar el código con Firebase
    this.authService.verifySmsCode(codigo)
      .pipe(
        // 2. Si Firebase aprueba, actualizar el estado en el backend (ClienteService)
        switchMap(() => {
          return this.clienteService.verificarTelefono(this.firebaseUid);
        }),
        finalize(() => this.isLoadingVerification = false)
      )
      .subscribe({
        next: (cliente) => {
          this.isPhoneVerified = true;
          alert('✅ ¡Teléfono verificado correctamente!');
          // Forzar recarga de AuthState para refrescar los datos de perfil
          this.authService.refreshUser().toPromise();
        },
        error: (error) => {
          console.error('❌ Error en verificación/backend:', error);
          alert(`❌ Error de verificación: ${error.message || 'Código incorrecto o expirado.'}`);
        }
      });
  }

  // Validador personalizado para confirmar contraseña
  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  loadUserData() {
    const currentUser = this.authService.getCurrentUser();
    const firebaseUser = this.authService.getFirebaseCurrentUser();

    if (currentUser && firebaseUser) {
      this.firebaseUid = currentUser.uid;

      // 🆕 Cargar estado de verificación de Firebase
      this.isEmailVerified = firebaseUser.emailVerified;

      this.perfilForm.patchValue({
        displayName: currentUser.displayName || ''
      });
      this.originalDisplayName = currentUser.displayName || '';

      // Cargar foto/icono
      if (currentUser.photoURL) {
        this.profileImage = currentUser.photoURL;
        this.originalImage = currentUser.photoURL;
      }
      if (currentUser.customIcon) {
        this.selectedIcon = currentUser.customIcon;
        this.originalIcon = currentUser.customIcon;
      }

      // 🆕 Cargar estado de verificación de teléfono desde el backend
      this.cargarEstadoTelefono();
    }
  }

  /**
   * Carga el estado de verificación del teléfono del Cliente.
   */
  private cargarEstadoTelefono(): void {
    this.clienteService.obtenerPerfil(this.firebaseUid)
      .pipe(finalize(() => this.isSendingVerificationCode = false))
      .subscribe({
        next: (cliente) => {
          this.isPhoneVerified = cliente.telefonoVerificado;
          const telefonoCompleto = `${cliente.prefijoTelefono || ''}${cliente.telefono || ''}`;
          this.phoneVerificationForm.patchValue({
            telefonoCompleto: telefonoCompleto
          });
        },
        error: (err) => {
          console.warn('No se pudo obtener el estado del teléfono (404/Error de datos)', err);
          this.isPhoneVerified = false; // Asumir no verificado en caso de error
        }
      });
  }

  // ===============================================
  // LÓGICA DE VERIFICACIÓN DE CORREO (OPCIONAL)
  // ===============================================

  /**
   * 🆕 Envía el correo de verificación de forma opcional (POST-LOGIN).
   */
  sendEmailVerification(): void {
    this.isSendingEmail = true;
    this.authService.sendVerificationEmail()
      .pipe(finalize(() => this.isSendingEmail = false))
      .subscribe({
        next: () => {
          alert('✅ Correo de verificación enviado exitosamente. Revisa tu bandeja de entrada.');
        },
        error: (error) => {
          alert(`❌ Error: ${error.message}`);
        }
      });
  }

  // Métodos para manejo de iconos
  selectIcon(iconClass: string) {
    this.selectedIcon = iconClass;
  }

  // Método para subir imagen de perfil
  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
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
  }

  removeProfileImage() {
    this.profileImage = null;
    // Resetear el input file
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  //Método para verificar si hay cambios en el avatar
  hasAvatarChanges(): boolean {
    const imageChanged = this.profileImage !== this.originalImage;
    const iconChanged = this.selectedIcon !== this.originalIcon;
    return imageChanged || iconChanged;
  }

  // Método específico para guardar avatar
  async guardarAvatar() {
    if (!this.hasAvatarChanges()) {
      return;
    }

    this.isLoadingAvatar = true;
    try {
      // 🚨 CAMBIO: Llamar a ProfileService para actualizar photoURL/customIcon
      await this.profileService.updateProfile({
        photoURL: this.profileImage, // Base64 si es nuevo, o null si se eliminó, o URL si es existente
        customIcon: this.profileImage ? null : this.selectedIcon // Solo guardar icono si no hay imagen
      } as ProfileUpdateData).toPromise();

      // Actualizar los valores originales después de guardar
      // Una llamada a refreshUser en AuthStateService actualizará esto, 
      // pero actualizamos localmente para mejor UX
      this.originalImage = this.profileImage;
      this.originalIcon = this.selectedIcon;
      // Forzar la recarga del estado si es necesario
      this.authService.refreshUser().toPromise();

      alert('Avatar actualizado correctamente');

    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      alert('Error al actualizar el avatar. Por favor intenta nuevamente.');
    } finally {
      this.isLoadingAvatar = false;
    }
  }

  // Guardar cambios del perfil (Display Name)
  async guardarPerfil() {
    if (this.perfilForm.valid) {
      this.isLoadingProfile = true;

      try {
        const formData = this.perfilForm.value;

        // Verificar si el displayName cambió
        const displayNameChanged = formData.displayName !== this.originalDisplayName;
        if (displayNameChanged) {
          // 🚨 CAMBIO: Llamar a ProfileService para actualizar el displayName en Firebase Auth/Firestore
          await this.profileService.updateProfile({
            displayName: formData.displayName
          } as ProfileUpdateData).toPromise();
        }

        alert('Perfil actualizado correctamente');
        this.originalDisplayName = formData.displayName; // Actualizar localmente

      } catch (error) {
        console.error('Error al actualizar perfil:', error);
        alert('Error al actualizar el perfil. Por favor intenta nuevamente.');
      } finally {
        this.isLoadingProfile = false;
      }
    }
  }

  // Cambiar contraseña
  async cambiarPassword() {
    if (this.passwordForm.valid) {
      this.isLoadingPassword = true;

      try {
        const formData = this.passwordForm.value;

        // 🚨 CAMBIO: Llamar a PasswordService
        await this.passwordService.changePassword(
          formData.currentPassword,
          formData.newPassword
        ).toPromise();

        alert('Contraseña cambiada correctamente');
        this.passwordForm.reset();

      } catch (error: any) {
        console.error('Error al cambiar contraseña:', error);

        // Manejar errores específicos de Firebase
        let errorMessage = 'Error al cambiar la contraseña. Por favor intenta nuevamente.';

        // Los códigos de error de Firebase están en la excepción
        if (error.code === 'auth/wrong-password') {
          errorMessage = 'La contraseña actual es incorrecta.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'La nueva contraseña es muy débil.';
        } else if (error.message) {
          errorMessage = error.message; // Usar el mensaje genérico si el servicio lo lanzó
        }

        alert(errorMessage);
      } finally {
        this.isLoadingPassword = false;
      }
    }
  }

  // Métodos auxiliares para validación
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

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