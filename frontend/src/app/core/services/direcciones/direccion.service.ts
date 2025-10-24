import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Direccion } from '@core/models/direcciones/direccion.model';

@Injectable({
    providedIn: 'root'
})
export class DireccionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/usuarios/direcciones`;

    /**
     * GET /api/usuarios/direcciones
     * Carga todas las direcciones del usuario autenticado.
     */
    obtenerDirecciones(): Observable<Direccion[]> {
        return this.http.get<Direccion[]>(this.apiUrl);
    }

    /**
     * POST /api/usuarios/direcciones
     * Guarda una nueva dirección.
     */
    guardarDireccion(direccion: Direccion): Observable<Direccion> {
        return this.http.post<Direccion>(this.apiUrl, direccion);
    }

    /**
     * PUT /api/usuarios/direcciones/{idDireccion}
     * Actualiza una dirección existente.
     */
    actualizarDireccion(id: number, direccion: Direccion): Observable<Direccion> {
        return this.http.put<Direccion>(`${this.apiUrl}/${id}`, direccion);
    }

    /**
    * PUT /api/usuarios/direcciones/{idDireccion}/principal
    * Marca una dirección como principal.
    */
    actualizarDireccionPrincipal(id: number, direccion: Direccion): Observable<Direccion> {
        return this.http.put<Direccion>(`${this.apiUrl}/${id}/principal`, direccion);
    }

    /**
     * DELETE /api/usuarios/direcciones/{idDireccion}
     * Elimina una dirección.
     */
    eliminarDireccion(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}