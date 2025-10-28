// ====================================================================================================
// DTO para enviar la solicitud de actualización de los datos detallados del cliente (ej. datos personales, teléfono).
// Utilizado en: CompleteDataComponent (datos del formulario) y ClientService (método updateClientData).
// ===================================================================================================
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

// ====================================================================================================
// DTO para la respuesta del servidor al solicitar el perfil completo y detallado del usuario (datos de cliente). 
// Contiene campos como documentos, teléfonos, y fechas.
// Utilizado en: ClientService (método getClientData para tipar la respuesta HTTP).
// ===================================================================================================
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

// ====================================================================================================
// DTO genérico para tipar las respuestas de endpoints que solo devuelven un mensaje (mensaje) y un estado (success) de la operación.
// Utilizado en: ClientService (método updateClientData).
// ===================================================================================================
export interface MessageResponse {
    mensaje: string;
    success: boolean;
}