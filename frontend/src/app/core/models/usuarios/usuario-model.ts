export interface ActualizarUsuarioRequest {
    nombres?: string;
    apellidos?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    fechaNacimiento?: string;
    prefijoTelefono?: string;
    telefono?: string;
    telefonoVerificado?: boolean;
}

export interface UsuarioBackendResponse {
    idUsuario: number;
    firebaseUid: string;
    email: string;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
    nombreRol: string;
    isAdmin: boolean;
    tipoDocumento?: string;
    numeroDocumento?: string;
    fechaNacimiento?: string;
    edad?: number;
    prefijoTelefono?: string;
    telefono?: string;
    telefonoVerificado: boolean;
    activo: boolean;
    fechaCreacion: string;
    ultimoAcceso?: string;
    fechaActualizacion?: string;
    datosCompletos: boolean;
}

export interface MessageResponse {
    mensaje: string;
    success: boolean;
}