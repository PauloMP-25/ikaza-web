import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@core/services/auth/auth';
import { AuthStateService } from '@core/services/auth/auth.state';

// Modelos
import { LoginCredentials, RegisterData } from '@core/models/auth-firebase/auth.backend.models';
@Component({
  selector: 'app-modal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal_login.html',
  styleUrls: ['./modal_login.scss']
})
export class ModalLoginComponent {
  @Input() isOpen = false; //controla visibilidad
  @Input() returnUrl: string = ''; //URL a la que redirigir
  @Input() infoMessage: string = ''; //Mensaje informativo (del guard)
  @Output() close = new EventEmitter<void>(); // evento para cerrar modal (por cancelación/redirección por defecto)
  @Output() loginSuccess = new EventEmitter<void>(); //Evento de login exitoso

  private authService = inject(AuthService);
  private authStateService = inject(AuthStateService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isSignUp = false; // Controla si mostrar sign up o login
  errorMessage = '';
  successMessage = '';

  // Formularios reactivos
  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // 🚨 CAMBIO CRÍTICO: Formulario de registro simplificado
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Validador personalizado para confirmar contraseña
   */
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { 'passwordMismatch': true };
    }

    return null;
  }

  // Getters para acceder al estado
  get isLoading(): boolean {
    return this.authStateService.getLoadingState();
  }

  get currentUser() {
    return this.authStateService.getCurrentUser();
  }

  /**
     * Cerrar modal y resetear estado
     */
  onClose(): void {
    this.close.emit(); // <--- Esto le dice al NavbarAuthComponent que se cierre.
    this.resetModalState();
  }

  /**
   * Cambiar entre login y registro
   */
  toggleSignUp(value: boolean): void {
    this.isSignUp = value;
    this.clearMessages();
    this.resetForms();
  }

  /**
   * Manejar login con email/password
   */
  onLogin(): void {
    if (this.loginForm.invalid) {
      this.showError('Por favor completa todos los campos correctamente');
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.clearMessages();
    const credentials: LoginCredentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (user) => {
        console.log('Login exitoso:', user);
        this.handleSuccessfulLogin(); // 👈 Llamar a la nueva lógica
      },
      error: (error) => {
        this.showError(error.message);
      }
    });
  }

  /**
     * Manejar registro con email/password
     */
  onRegister(): void {
    if (this.registerForm.invalid) {
      this.showError('Por favor completa todos los campos correctamente');
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.clearMessages();
    // NOTA: RegisterData ya no contendrá nombres/apellidos en el modelo.
    const registerData: RegisterData = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (message) => {
        this.showSuccess('✅ Registro exitoso. ¡Inicia sesión con tu nueva cuenta!'); // Cambiamos el mensaje
        this.registerForm.reset();

        // Cambiar a login después de un tiempo
        setTimeout(() => {
          this.toggleSignUp(false);
          this.successMessage = 'Ahora puedes iniciar sesión';
          setTimeout(() => this.clearMessages(), 3000);
        }, 3000);
      },
      error: (error) => {
        this.showError(error.message);
      }
    });
  }



  /**
   * Manejar login con Google
   */
  onGoogleLogin(): void {
    this.clearMessages();

    this.authService.loginWithGoogle().subscribe({
      next: (user) => {
        console.log('Login con Google exitoso:', user);
        this.handleSuccessfulLogin(); // 👈 Llamar a la nueva lógica
      },
      error: (error) => {
        this.showError(error.message);
      }
    });
  }

  /**
     * Manejar login exitoso y redirección
     */
  private handleSuccessfulLogin(): void {
    this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
    this.loginSuccess.emit();
    if (this.returnUrl) {
      // 1. Redirigir a la ruta guardada por el Guard
      setTimeout(() => {
        console.log('🔀 Redirigiendo a URL protegida:', this.returnUrl);
        this.router.navigateByUrl(this.returnUrl);
        this.loginSuccess.emit(); // Emitir evento para que el padre sepa que todo terminó
      }, 1000);
    } else {
      // 2. Si no hay returnUrl, el servicio o el componente padre maneja la redirección
      setTimeout(() => {
        console.log('🔀 Login exitoso sin returnUrl. Redirección por defecto.');
        // El padre o el AuthService manejan la redirección por rol si es necesario
        this.loginSuccess.emit();
      }, 1000);
    }
  }

  // Helpers para mostrar errores de validación
  getLoginFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      if (field.errors?.['required']) return `${fieldName} es requerido`;
      if (field.errors?.['email']) return 'Email inválido';
      if (field.errors?.['minlength']) return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  /**
   * Obtener error de validación para un campo específico
   */
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);

    if (!field || !field.invalid || !field.touched) {
      return '';
    }

    const errors = field.errors;
    if (!errors) return '';

    // Errores específicos
    if (errors['required']) {
      return `${this.getFieldDisplayName(fieldName)} es requerido`;
    }

    if (errors['email']) {
      return 'Email inválido';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Mínimo ${requiredLength} caracteres`;
    }

    // Error específico para confirmación de contraseña
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }

    return 'Campo inválido';
  }

  /**
   * Verificar si un campo tiene errores y ha sido tocado
   */
  hasFieldError(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Marcar todos los campos de un formulario como tocados
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtener nombre de display para un campo
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'email': 'Email',
      'password': 'Contraseña',
      'confirmPassword': 'Confirmar contraseña',
      'username': 'Nombre de usuario'
    };

    return displayNames[fieldName] || fieldName;
  }

  /**
   * Mostrar mensaje de error
   */
  private showError(message: string): void {
    console.log("Mensaje de error: ", message)
    this.errorMessage = message;
    this.successMessage = '';
  }

  /**
   * Mostrar mensaje de éxito
   */
  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
  }

  /**
   * Limpiar mensajes
   */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Resetear formularios
   */
  private resetForms(): void {
    this.loginForm.reset();
    this.registerForm.reset();
  }

  /**
   * Resetear estado completo del modal
   */
  private resetModalState(): void {
    this.isSignUp = false;
    this.clearMessages();
    this.resetForms();
  }
}
