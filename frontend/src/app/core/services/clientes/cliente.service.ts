// src/app/services/backend/usuario-backend.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ActualizarClienteRequest, ClienteResponse, MessageResponse } from '@core/models/usuarios/usuario-model';

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
     * GET /api/clientes/perfil/{firebaseUid}
     * Obtener perfil del cliente autenticado.
     */
    obtenerPerfil(firebaseUid: string): Observable<ClienteResponse> {
        return this.http.get<ClienteResponse>(`${this.apiUrl}/perfil/${firebaseUid}`);
    }

    /**
     * PUT /api/clientes/perfil/{firebaseUid}
     * Actualizar perfil propio del cliente.
     */
    actualizarPerfil(firebaseUid: string, request: ActualizarClienteRequest): Observable<ClienteResponse> {
        return this.http.put<ClienteResponse>(`${this.apiUrl}/perfil/${firebaseUid}`, request);
    }

    /**
     * PUT /api/clientes/perfil/{firebaseUid}/verificar-telefono
     * Verificar teléfono del cliente.
     */
    verificarTelefono(firebaseUid: string): Observable<ClienteResponse> {
        return this.http.put<ClienteResponse>(
            `${this.apiUrl}/perfil/${firebaseUid}/verificar-telefono`,
            {}
        );
    }

    // ==========================================
    // ENDPOINTS ADMINISTRATIVOS (CLIENTES)
    // ==========================================

    /**
     * GET /api/clientes
     * Listar clientes con paginación (solo admin).
     */
    listarClientes( // <-- Nombre del método ajustado
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
     * Buscar clientes con filtros (solo email, documento, telefono).
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
        // Eliminado filtro 'nombre' y 'activo' ya que la búsqueda solo permite 3 campos.

        return this.http.get<ClienteResponse[]>(`${this.apiUrl}/buscar`, { params });
    }

    /**
     * GET /api/clientes/estadisticas
     * Obtener estadísticas administrativas de clientes.
     */
    obtenerEstadisticas(): Observable<any> {
        return this.http.get(`${this.apiUrl}/estadisticas`);
    }

    /**
     * PUT /api/clientes/{id}/activar
     * Activar cliente/usuario (admin).
     */
    activarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/activar`, {});
    }

    /**
     * PUT /api/clientes/{id}/desactivar
     * Desactivar cliente/usuario (admin).
     */
    desactivarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/desactivar`, {});
    }

    /**
     * @deprecated Usar obtenerPerfil() en su lugar
     * Mantener temporalmente para compatibilidad
     */
    obtenerPorFirebaseUid(firebaseUid: string): Observable<ClienteResponse> {
        console.warn('⚠️ obtenerPorFirebaseUid está deprecado, usa obtenerPerfil()');
        return this.obtenerPerfil(firebaseUid);
    }
}