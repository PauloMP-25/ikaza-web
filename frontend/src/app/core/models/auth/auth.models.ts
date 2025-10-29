// src/app/core/models/auth/auth.models.ts

/**
 * ============================================================================
 * MODELOS DE AUTENTICACIÓN JWT NATIVO
 * ============================================================================
 */

// ====================================================================================================
// Credenciales de login
// ====================================================================================================
export interface LoginCredentials {
    email: string;
    password: string;
}

// ====================================================================================================
// Datos de registro
// ====================================================================================================
export interface RegisterData {
    email: string;
    password: string;
    confirmPassword: string;
    username?: string;
}

// ====================================================================================================
// Respuesta del backend después de login/registro exitoso
// ====================================================================================================
export interface AuthResponse {
    token: string;
    refreshToken: string;
    idUsuario: number;
    email: string;
    username?: string;
    rol: string;
    isAdmin: boolean;
    activo: boolean;
    fechaCreacion: string;
    ultimoAcceso?: string;
    mensaje: string;
    success: boolean;
}

// ====================================================================================================
// Datos del usuario en sesión (reemplaza UserData de Firebase)
// ====================================================================================================
export interface UserData {
    idUsuario: number;
    email: string;
    username?: string;
    rol: string;
    isAdmin: boolean;
    activo: boolean;
    photoURL?: string;
    customIcon?: string;
    fechaCreacion: Date;
    ultimoAcceso?: Date;
}

// ====================================================================================================
// Estados de autenticación
// ====================================================================================================
export enum AuthState {
    LOADING = 'loading',
    AUTHENTICATED = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated',
    ERROR = 'error'
}

// ====================================================================================================
// Información completa del estado de auth
// ====================================================================================================
export interface AuthStateInfo {
    state: AuthState;
    user: UserData | null;
    loading: boolean;
    error: string | null;
}

// ====================================================================================================
// Token decodificado (JWT Payload)
// ====================================================================================================
export interface DecodedToken {
    sub: string; // email
    iat: number; // issued at
    exp: number; // expiration
    rol?: string;
}

// ====================================================================================================
// Respuesta genérica del backend
// ====================================================================================================
export interface MessageResponse {
    mensaje: string;
    success: boolean;
}