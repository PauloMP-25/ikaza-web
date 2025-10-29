// src/app/features/login/modal-login/modal-login.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@core/services/auth/auth';
import { AuthStateService } from '@core/services/auth/auth.state';
import { LoginCredentials, RegisterData } from '@core/models/auth/auth.models';

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
    // Formulario de login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Formulario de registro
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
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

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isLoading(): boolean {
    return this.authStateService.getLoadingState();
  }

  get currentUser() {
    return this.authStateService.getCurrentUser();
  }

  // ============================================================================
  // MÉTODOS DE UI
  // ============================================================================

  /**
   * Cerrar modal
   */
  onClose(): void {
    this.close.emit();
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

  // ============================================================================
  // LOGIN
  // ============================================================================

  /**
   * Manejar login
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
        console.log('✅ Login exitoso:', user);
        this.handleSuccessfulLogin();
      },
      error: (error) => {
        this.showError(error.message);
      }
    });
  }

  // ============================================================================
  // REGISTRO
  // ============================================================================

  /**
   * Manejar registro
   */
  onRegister(): void {
    if (this.registerForm.invalid) {
      this.showError('Por favor completa todos los campos correctamente');
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.clearMessages();
    const registerData: RegisterData = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (message) => {
        this.showSuccess(message);
        this.registerForm.reset();

        // Cambiar a login después de 3 segundos
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

  // ============================================================================
  // MANEJO DE ÉXITO
  // ============================================================================

  /**
   * Manejar login/registro exitoso
   */
  private handleSuccessfulLogin(): void {
    this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
    this.loginSuccess.emit();

    if (this.returnUrl) {
      setTimeout(() => {
        console.log('🔀 Redirigiendo a:', this.returnUrl);
        this.router.navigateByUrl(this.returnUrl);
      }, 1000);
    } else {
      setTimeout(() => {
        console.log('🔀 Redirección por defecto');
        this.loginSuccess.emit();
      }, 1000);
    }
  }

  // ============================================================================
  // VALIDACIÓN DE CAMPOS
  // ============================================================================

  /**
   * Obtener error de un campo
   */
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);

    if (!field || !field.invalid || !field.touched) {
      return '';
    }

    const errors = field.errors;
    if (!errors) return '';

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

    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }

    return 'Campo inválido';
  }

  /**
   * Verificar si un campo tiene error
   */
  hasFieldError(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Marcar todos los campos como tocados
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Obtener nombre de display
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'email': 'Email',
      'password': 'Contraseña',
      'confirmPassword': 'Confirmar contraseña'
    };

    return displayNames[fieldName] || fieldName;
  }

  // ============================================================================
  // MENSAJES
  // ============================================================================

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ============================================================================
  // RESET
  // ============================================================================

  private resetForms(): void {
    this.loginForm.reset();
    this.registerForm.reset();
  }

  private resetModalState(): void {
    this.isSignUp = false;
    this.clearMessages();
    this.resetForms();
  }
}
