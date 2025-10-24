// src/app/models/categoria.model.ts
export interface Categoria {
    idCategoria: number;
    nombreCategoria: string;
    descripcionCategoria: string;
    activo: boolean;
    fechaCreacion: string;
    cantidadProductos: number;
}

export interface CategoriaRequest {
    nombreCategoria: string;
    descripcionCategoria?: string;
    activo?: boolean;
}