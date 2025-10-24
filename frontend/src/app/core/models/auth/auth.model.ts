// src/app/models/auth.model.ts
export interface User {
    id: number;
    email: string;
    nombres: string;
    apellidos: string;
    roles: string[];
}