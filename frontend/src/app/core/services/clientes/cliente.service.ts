import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ActualizarClienteRequest, ClienteResponse, MessageResponse } from '@core/models/cliente/cliente.models';

@Injectable({
    providedIn: 'root'
})
export class ClienteService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/clientes`;

    // ==========================================
    // ENDPOINTS DE PERFIL (Cliente autenticado)
    // ==========================================

    /**
     * GET /api/clientes/perfil/{email}
     * Obtener perfil del cliente autenticado por email
     */
    obtenerPerfil(email: string): Observable<ClienteResponse> {
        return this.http.get<ClienteResponse>(`${this.apiUrl}/perfil/${email}`);
    }

    /**
     * PUT /api/clientes/perfil/{email}
     * Actualizar perfil propio del cliente
     */
    actualizarPerfil(email: string, request: ActualizarClienteRequest): Observable<ClienteResponse> {
        return this.http.put<ClienteResponse>(`${this.apiUrl}/perfil/${email}`, request);
    }

    /**
     * PUT /api/clientes/perfil/{email}/verificar-telefono
     * Verificar teléfono del cliente
     */
    verificarTelefono(email: string): Observable<ClienteResponse> {
        return this.http.put<ClienteResponse>(
            `${this.apiUrl}/perfil/${email}/verificar-telefono`,
            {}
        );
    }

    // ==========================================
    // ENDPOINTS ADMINISTRATIVOS
    // ==========================================

    /**
     * GET /api/clientes
     * Listar clientes con paginación (solo admin)
     */
    listarClientes(
        page: number = 0,
        size: number = 10,
        sortBy: string = 'fechaCreacion',
        sortDir: string = 'DESC'
    ): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sortBy', sortBy)
            .set('sortDir', sortDir);

        return this.http.get(`${this.apiUrl}`, { params });
    }

    /**
     * GET /api/clientes/buscar
     * Buscar clientes con filtros
     */
    buscarClientes(filtros: {
        email?: string;
        documento?: string;
        telefono?: string;
    }): Observable<ClienteResponse[]> {
        let params = new HttpParams();

        if (filtros.email) params = params.set('email', filtros.email);
        if (filtros.documento) params = params.set('documento', filtros.documento);
        if (filtros.telefono) params = params.set('telefono', filtros.telefono);

        return this.http.get<ClienteResponse[]>(`${this.apiUrl}/buscar`, { params });
    }

    /**
     * GET /api/clientes/estadisticas
     * Obtener estadísticas administrativas
     */
    obtenerEstadisticas(): Observable<any> {
        return this.http.get(`${this.apiUrl}/estadisticas`);
    }

    /**
     * PUT /api/clientes/{id}/activar
     * Activar cliente/usuario (admin)
     */
    activarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/activar`, {});
    }

    /**
     * PUT /api/clientes/{id}/desactivar
     * Desactivar cliente/usuario (admin)
     */
    desactivarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/desactivar`, {});
    }
}
