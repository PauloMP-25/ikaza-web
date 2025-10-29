export interface Producto {
    idProducto: number;
    nombreProducto: string;
    descripcionProducto: string;
    precio: number;
    stock: number;
    stockMinimo: number;
    calificacionPromedio: number;
    nombreCategoria: string;
    idCategoria: number;
    fechaCreacion: string;
    fechaActualizacion: string;
    imagenPrincipal?: string;
    marca?: string;
    modelo?: string;
    disponible: boolean;
}

export interface ProductoDetalle extends Producto {
    codigo?: string;
    garantia?: string;
    instruccionesUso?: string;
    imagenes?: ImagenProducto[];
    atributos?: { [key: string]: string };
    especificaciones?: Especificacion[];
    variantes?: Variante[];
    seo?: SeoInfo;
    stockDisponible?: number;
    stockReservado?: number;
}

export interface ImagenProducto {
    url: string;
    alt: string;
    esPrincipal: boolean;
    orden: number;
}

export interface Especificacion {
    nombre: string;
    valor: string;
    unidad: string;
}

export interface Variante{
    sku: string;
    color: string;
    talla: string;
    material: string;
    stockAdicional: number;
    imagenUrl: string;
}

export interface SeoInfo {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}
export interface Review {
  id?: number;
  productId?: number;
  name: string;
  rating: number;  // 1 a 5
  comment: string;
  createdAt: string;
}

export interface ProductoRequest {
    idCategoria: number;
    nombreProducto: string;
    descripcionProducto?: string;
    precio: number;
    stock: number;
    stockMinimo?: number;
    codigo?: string;
    marca?: string;
    modelo?: string;
    garantia?: string;
    imagenesUrls?: string[];
    atributos?: { [key: string]: string };
}

export interface ProductoUpdateRequest {
    idCategoria?: number;
    nombreProducto?: string;
    descripcionProducto?: string;
    precio?: number;
    stock?: number;
    stockMinimo?: number;
}