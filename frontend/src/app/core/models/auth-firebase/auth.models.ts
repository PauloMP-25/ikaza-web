// ====================================================================================================
// DTO para la respuesta del servidor después de un login o registro exitoso. 
// Contiene los tokens de sesión (JWT) y los datos básicos del usuario.
// Utilizado en: AuthService (para tipar la respuesta de los métodos login y register).
// ===================================================================================================
export interface AuthResponse {
    token: string;
    refreshToken?: string;
    idUsuario: number;
    firebaseUid: string;
    email: string;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
    rol: string;
    isAdmin: boolean;
    activo: boolean;
    datosCompletos: boolean;
    fechaCreacion: string;
    ultimoAcceso?: string;
    mensaje: string;
    success: boolean;
}

// ====================================================================================================
// DTO para la solicitud HTTP de registro al backend. 
// Es la data limpia que el backend espera (usualmente sin la confirmación de contraseña).
// Utilizado en: AuthService (método register para tipar la solicitud HTTP).
// ===================================================================================================
export interface RegistroBackendRequest {
    email: string;
    password: string;
}