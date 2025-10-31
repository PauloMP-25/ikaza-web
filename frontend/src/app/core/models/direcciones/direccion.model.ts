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
    pais?: string | null;
}

// Mantener AddressInfo para Google Maps
export interface DireccionDTO {
    alias: string;
    direccion: string;
    region: string;
    provincia: string;
    distrito: string;
    referencia?: string | null;
    esPrincipal: boolean;
}

