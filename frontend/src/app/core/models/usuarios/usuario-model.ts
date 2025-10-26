export interface ActualizarClienteRequest {
    nombres?: string;
    apellidos?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    fechaNacimiento?: string;
    prefijoTelefono?: string;
    telefono?: string;
    telefonoVerificado?: boolean;
    genero: String
}

export interface ClienteResponse {
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
    genero: String;
}

export interface MessageResponse {
    mensaje: string;
    success: boolean;
}