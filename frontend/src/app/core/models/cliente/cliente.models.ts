/**
 * ============================================================================
 * MODELOS DE CLIENTE
 * ============================================================================
 */
export interface ActualizarClienteRequest {
    nombres?: string;
    apellidos?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    fechaNacimiento?: string;
    prefijoTelefono?: string;
    telefono?: string;
    telefonoVerificado?: boolean;
    genero?: string;
}

export interface ClienteResponse {
    idUsuario: number;
    email: string;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
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
    genero?: string;
}

export interface MessageResponse {
    mensaje: string;
    success: boolean;
}