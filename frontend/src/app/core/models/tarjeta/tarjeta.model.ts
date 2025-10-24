// Modelo que coincide con la entidad MetodoPago del backend
export interface Tarjeta {
    idMetodo?: number;                    // id_metodo (generado por BD)
    tipo: string;                         // TARJETA_CREDITO, TARJETA_DEBITO, etc.
    alias?: string | null;                // Nombre personalizado
    ultimos4Digitos?: string | null;      // Últimos 4 dígitos
    nombreTitular?: string | null;        // Nombre del titular
    bancoEmisor?: string | null;          // Banco emisor (de API IIN)
    tipoTarjeta?: string | null;          // VISA, MASTERCARD, AMEX (de API IIN)
    fechaExpiracion?: string | null;      // MM/YY
    tokenPago: string;                    // Token encriptado (REQUERIDO)
    esPrincipal?: boolean;                // Default: false
    activo?: boolean;                     // Default: true (manejado por backend)
    fechaCreacion?: string | null;                // Timestamp de creación
}

// Interfaz para la respuesta de la API IIN (la que ya tienes)
export interface CardInfo {
    bin: string;
    cardBrand: string;              // Mapea a tipoTarjeta
    issuingInstitution: string;     // Mapea a bancoEmisor
    cardType: string;               // Crédito/Débito - mapea a tipo
    cardCategory: string;
    issuingCountry: string;
    issuingCountryCode: string;
}

// Interfaz auxiliar para el formulario (datos temporales mientras se valida)
export interface TarjetaFormData {
    numero: string;           // Número completo (temporal, no se guarda)
    titular: string;
    expiracion: string;       // MM/YY
    cvv: string;              // Temporal, no se guarda
    tipoSeleccionado: 'visa' | 'mastercard' | 'amex';
    alias?: string;
    esPrincipal?: boolean;
}