// src/app/services/backend/usuario-backend.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map, catchError, of } from 'rxjs';
import { ActualizarUsuarioRequest, UsuarioBackendResponse, MessageResponse } from '@core/models/usuarios/usuario-model';

@Injectable({
    providedIn: 'root'
})
export class UsuarioBackendService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/usuarios`;

    // ==========================================
    // ENDPOINTS DE PERFIL (Usuario autenticado)
    // ==========================================

    /**
     * 🆕 GET /api/usuarios/perfil/{firebaseUid}
     * Obtener perfil del usuario autenticado
     */
    obtenerPerfil(firebaseUid: string): Observable<UsuarioBackendResponse> {
        return this.http.get<UsuarioBackendResponse>(`${this.apiUrl}/perfil/${firebaseUid}`);
    }

    /**
     * 🆕 PUT /api/usuarios/perfil/{firebaseUid}
     * Actualizar perfil propio
     */
    actualizarPerfil(firebaseUid: string, request: ActualizarUsuarioRequest): Observable<UsuarioBackendResponse> {
        return this.http.put<UsuarioBackendResponse>(`${this.apiUrl}/perfil/${firebaseUid}`, request);
    }

    /**
     * 🆕 PUT /api/usuarios/perfil/{firebaseUid}/verificar-telefono
     * Verificar teléfono
     */
    verificarTelefono(firebaseUid: string): Observable<UsuarioBackendResponse> {
        return this.http.put<UsuarioBackendResponse>(
            `${this.apiUrl}/perfil/${firebaseUid}/verificar-telefono`,
            {}
        );
    }

    // ==========================================
    // ENDPOINTS ADMINISTRATIVOS
    // ==========================================

    /**
     * 🆕 GET /api/usuarios
     * Listar usuarios con paginación (solo admin)
     */
    listarUsuarios(
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
     * 🆕 GET /api/usuarios/{id}
     * Obtener usuario por ID (admin)
     */
    obtenerUsuarioPorId(id: number): Observable<UsuarioBackendResponse> {
        return this.http.get<UsuarioBackendResponse>(`${this.apiUrl}/${id}`);
    }

    /**
     * 🆕 GET /api/usuarios/buscar
     * Buscar usuarios con filtros (admin)
     */
    buscarUsuarios(filtros: {
        email?: string;
        nombre?: string;
        documento?: string;
        activo?: boolean;
    }): Observable<UsuarioBackendResponse[]> {
        let params = new HttpParams();

        if (filtros.email) params = params.set('email', filtros.email);
        if (filtros.nombre) params = params.set('nombre', filtros.nombre);
        if (filtros.documento) params = params.set('documento', filtros.documento);
        if (filtros.activo !== undefined) params = params.set('activo', filtros.activo.toString());

        return this.http.get<UsuarioBackendResponse[]>(`${this.apiUrl}/buscar`, { params });
    }

    /**
     * GET /api/usuarios/incompletos
     * Obtener usuarios con datos incompletos (admin)
     */
    obtenerUsuariosIncompletos(): Observable<UsuarioBackendResponse[]> {
        return this.http.get<UsuarioBackendResponse[]>(`${this.apiUrl}/incompletos`);
    }

    /**
     * 🆕 GET /api/usuarios/estadisticas
     * Obtener estadísticas de usuarios (admin)
     */
    obtenerEstadisticas(): Observable<any> {
        return this.http.get(`${this.apiUrl}/estadisticas`);
    }

    /**
     * 🆕 PUT /api/usuarios/{id}
     * Actualizar usuario (admin)
     */
    actualizarUsuario(id: number, request: ActualizarUsuarioRequest): Observable<UsuarioBackendResponse> {
        return this.http.put<UsuarioBackendResponse>(`${this.apiUrl}/${id}`, request);
    }

    /**
     * 🆕 PUT /api/usuarios/{id}/activar
     * Activar usuario (admin)
     */
    activarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/activar`, {});
    }

    /**
     * 🆕 PUT /api/usuarios/{id}/desactivar
     * Desactivar usuario (admin)
     */
    desactivarUsuario(id: number): Observable<MessageResponse> {
        return this.http.put<MessageResponse>(`${this.apiUrl}/${id}/desactivar`, {});
    }

    /**
     * 🆕 PUT /api/usuarios/{id}/cambiar-rol
     * Cambiar rol de usuario (admin)
     */
    cambiarRol(id: number, nuevoRol: string): Observable<UsuarioBackendResponse> {
        return this.http.put<UsuarioBackendResponse>(
            `${this.apiUrl}/${id}/cambiar-rol?nuevoRol=${nuevoRol}`,
            {}
        );
    }

    /**
     * 🆕 DELETE /api/usuarios/{id}
     * Eliminar usuario (admin)
     */
    eliminarUsuario(id: number): Observable<MessageResponse> {
        return this.http.delete<MessageResponse>(`${this.apiUrl}/${id}`);
    }

    // ==========================================
    // MÉTODOS DE COMPATIBILIDAD (DEPRECADOS)
    // ==========================================

    /**
     * @deprecated Usar obtenerPerfil() en su lugar
     * Mantener temporalmente para compatibilidad
     */
    obtenerPorFirebaseUid(firebaseUid: string): Observable<UsuarioBackendResponse> {
        console.warn('⚠️ obtenerPorFirebaseUid está deprecado, usa obtenerPerfil()');
        return this.obtenerPerfil(firebaseUid);
    }

    /**
     * @deprecated Ya no se usa sincronización manual
     * El registro lo maneja AuthService
     */
    sincronizarUsuario(request: any): Observable<UsuarioBackendResponse> {
        console.warn('⚠️ sincronizarUsuario está deprecado, usa AuthService.register()');
        throw new Error('Método deprecado. Usa AuthService.register() para registrar usuarios.');
    }

    /**
     * @deprecated Ya no existe en el backend
     */
    verificarExistencia(firebaseUid: string): Observable<any> {
        console.warn('⚠️ verificarExistencia está deprecado');
        // Simulamos la respuesta para compatibilidad temporal
        return this.obtenerPerfil(firebaseUid).pipe(
            map((usuario) => ({
                existe: true,
                mensaje: 'Usuario encontrado',
                idUsuario: usuario.idUsuario,
                email: usuario.email
            })),
            catchError(() => {
                return of({
                    existe: false,
                    mensaje: 'Usuario no encontrado',
                    idUsuario: null,
                    email: null
                });
            })
        );
    }

    /**
     * @deprecated Usar actualizarPerfil() en su lugar
     */
    actualizarDatosExtendidos(firebaseUid: string, request: any): Observable<UsuarioBackendResponse> {
        console.warn('⚠️ actualizarDatosExtendidos está deprecado, usa actualizarPerfil()');
        return this.actualizarPerfil(firebaseUid, request);
    }

    /**
     * @deprecated Ya no existe en el backend
     */
    actualizarUltimoAcceso(firebaseUid: string): Observable<MessageResponse> {
        console.warn('⚠️ actualizarUltimoAcceso está deprecado, se actualiza automáticamente en el backend');
        // Retornar un observable vacío para compatibilidad
        return of({ mensaje: 'Último acceso se actualiza automáticamente', success: true });
    }

    /**
     * @deprecated Usar listarUsuarios() con paginación
     */
    obtenerTodos(): Observable<UsuarioBackendResponse[]> {
        console.warn('⚠️ obtenerTodos está deprecado, usa listarUsuarios() con paginación');
        return this.listarUsuarios(0, 100).pipe(
            map((response) => response.usuarios)
        );
    }
}

/**
 * 🔄 CAMBIOS PRINCIPALES:
 * 
 * ✅ NUEVOS ENDPOINTS:
 *    - obtenerPerfil() → GET /api/usuarios/perfil/{uid}
 *    - actualizarPerfil() → PUT /api/usuarios/perfil/{uid}
 *    - listarUsuarios() → GET /api/usuarios (con paginación)
 *    - buscarUsuarios() → GET /api/usuarios/buscar
 *    - obtenerEstadisticas() → GET /api/usuarios/estadisticas
 *    - cambiarRol() → PUT /api/usuarios/{id}/cambiar-rol
 *    - eliminarUsuario() → DELETE /api/usuarios/{id}
 * 
 * ⚠️ DEPRECADOS (mantienen compatibilidad temporal):
 *    - sincronizarUsuario() → Usar AuthService.register()
 *    - verificarExistencia() → Ya no existe en backend
 *    - actualizarDatosExtendidos() → Usar actualizarPerfil()
 *    - actualizarUltimoAcceso() → Se hace automático
 *    - obtenerPorFirebaseUid() → Usar obtenerPerfil()
 * 
 * 📝 NOTAS:
 * - Los métodos deprecados se mantienen temporalmente
 * - Emiten warnings en consola
 * - Deben ser reemplazados gradualmente
 * - Algunos simulan respuestas para no romper código existente
 */

// Importaciones adicionales necesarias para compatibilidad