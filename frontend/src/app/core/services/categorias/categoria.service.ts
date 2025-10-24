// src/app/services/categorias/categoria.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Categoria, CategoriaRequest } from '@core/models/categoria/categoria.model';

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/categorias`;

    /**
     * Obtener todas las categorías activas (público)
     */
    obtenerCategoriasActivas(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.apiUrl);
    }

    /**
     * Obtener todas las categorías incluyendo inactivas (admin)
     */
    obtenerTodasLasCategorias(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(`${this.apiUrl}/todas`);
    }

    /**
     * Obtener categoría por ID
     */
    obtenerCategoriaPorId(id: number): Observable<Categoria> {
        return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
    }

    /**
     * Crear categoría (admin)
     */
    crearCategoria(categoria: CategoriaRequest): Observable<Categoria> {
        return this.http.post<Categoria>(this.apiUrl, categoria);
    }

    /**
     * Actualizar categoría (admin)
     */
    actualizarCategoria(id: number, categoria: CategoriaRequest): Observable<Categoria> {
        return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria);
    }

    /**
     * Desactivar categoría (admin)
     */
    eliminarCategoria(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    /**
     * Eliminar definitivamente una categoría (admin)
     */
    eliminarCategoriaDefinitivo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}/definitivo`);
    }

    /**
     * Buscar categorías
     */
    buscarCategorias(texto: string): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(`${this.apiUrl}/buscar`, {
            params: { texto }
        });
    }
}