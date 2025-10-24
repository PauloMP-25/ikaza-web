// En tu direccion.model.ts
export interface Direccion {
    idDireccion?: number;
    alias?: string | null;
    direccion: string;        // dirección específica
    distrito?: string | null;
    provincia?: string | null;
    region?: string | null;
    referencia?: string | null;
    esPrincipal?: boolean | null;
    fechaCreacion?: Date;
    latitud?: number | null;
    longitud?: number | null;
    pais?: string | null;
    codigoPostal?: string | null; // agregar este campo
}

// Mantener AddressInfo para Google Maps
export interface AddressInfo {
    direccionCompleta: string;
    calle: string | null;
    numero: string | null;
    distrito: string | null;
    provincia: string | null;
    region: string | null;
    codigoPostal: string | null;
    pais: string | null;
    referencia?: string | null;
    coords: { lat: number, lng: number } | null;
}

