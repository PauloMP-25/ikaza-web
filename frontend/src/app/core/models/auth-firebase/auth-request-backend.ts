//Modelos del backend
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

export interface RegistroBackendRequest {
    email: string;
    password: string;
}