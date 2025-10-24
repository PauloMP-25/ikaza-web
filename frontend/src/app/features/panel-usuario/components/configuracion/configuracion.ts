import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth/auth';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss'
})
export class ConfiguracionComponent implements OnInit {

  // Formularios reactivos
  perfilForm: FormGroup;
  passwordForm: FormGroup;

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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.perfilForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });

    // Formulario para cambio de contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserData();
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
    // Cargar datos del usuario actual desde Firebase
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.perfilForm.patchValue({
        displayName: currentUser.displayName || ''
      });
      this.originalDisplayName = currentUser.displayName || '';

      // Si el usuario tiene una foto, cargarla
      if (currentUser.photoURL) {
        this.profileImage = currentUser.photoURL;
        this.originalImage = currentUser.photoURL;
      }

      // Cargar icono personalizado si existe
      if (currentUser.customIcon) {
        this.selectedIcon = currentUser.customIcon;
        this.originalIcon = currentUser.customIcon;
      }
    }
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

  //Método específico para guardar avatar
  async guardarAvatar() {
    if (!this.hasAvatarChanges()) {
      return;
    }

    this.isLoadingAvatar = true;
    try {
      // Actualizar avatar en Firebase
      await this.authService.updateProfile({
        photoURL: this.profileImage,
        customIcon: this.profileImage ? null : this.selectedIcon
      }).toPromise();

      // Actualizar los valores originales después de guardar
      this.originalImage = this.profileImage;
      this.originalIcon = this.selectedIcon;

      alert('Avatar actualizado correctamente');

    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      alert('Error al actualizar el avatar. Por favor intenta nuevamente.');
    } finally {
      this.isLoadingAvatar = false;
    }
  }

  // Guardar cambios del perfil
  async guardarPerfil() {
    if (this.perfilForm.valid) {
      this.isLoadingProfile = true;

      try {
        const formData = this.perfilForm.value;

        //Verificar si el displayName cambio
        const displayNameChanged = formData.displayName !== this.originalDisplayName;
        if(displayNameChanged){
          //ACTUALIZAR PERFIL
          await this.authService.updateProfile({
            displayName: formData.displayName
          }).toPromise();
        }

        alert('Perfil actualizado correctamente');

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

        await this.authService.changePassword(
          formData.currentPassword,
          formData.newPassword
        ).toPromise();

        alert('Contraseña cambiada correctamente');
        this.passwordForm.reset();

      } catch (error: any) {
        console.error('Error al cambiar contraseña:', error);

        // Manejar errores específicos de Firebase
        let errorMessage = 'Error al cambiar la contraseña. Por favor intenta nuevamente.';

        if (error.code === 'auth/wrong-password') {
          errorMessage = 'La contraseña actual es incorrecta.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'La nueva contraseña es muy débil.';
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