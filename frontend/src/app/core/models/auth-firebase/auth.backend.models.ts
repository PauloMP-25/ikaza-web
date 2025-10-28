// ====================================================================================================
// DTO (Data Transfer Object) que representa la información mínima necesaria para iniciar sesión (email y password).
// Utilizado en: LoginComponent (datos del formulario) y AuthService (método login).
// ===================================================================================================
export interface LoginCredentials {
    email: string;
    password: string;
}

// ====================================================================================================
// DTO para el formulario de registro en el frontend. Incluye campos como la confirmación de contraseña, 
// necesarios solo para la validación inicial en la interfaz.
// Utilizado en: RegisterComponent (datos del formulario).
// ===================================================================================================
export interface RegisterData {
    email: string;
    password: string;
    confirmPassword: string;
    username?: string;
}