// src/app/core/services/profile/profile.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthStateService } from '../auth/auth.state';

/**
 * ============================================================================
 * MODELOS DE PERFIL
 * ============================================================================
 */
export interface ProfileUpdateData {
    username?: string;
    photoURL?: string | null;
    customIcon?: string | null;
}

/**
 * ============================================================================
 * SERVICIO DE PERFIL (Sin Firebase/Firestore)
 * ============================================================================
 * Maneja la actualización de perfil directamente en el backend
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})

export class ProfileService {
    private http = inject(HttpClient);
    private authState = inject(AuthStateService);
    private apiUrl = `${environment.apiUrl}/api/usuarios`;

    /**
     * Actualizar username
     */
    updateProfile(email: string, profileData: ProfileUpdateData): Observable<any> {
        // Si solo cambia el username
        if (profileData.username && !profileData.photoURL) {
            return this.http.put(`${this.apiUrl}/perfil/${email}`, {
                username: profileData.username
            }).pipe(
                tap(() => console.log('✅ Username actualizado')),
                switchMap(() => this.actualizarEstadoLocal(email, profileData))
            );
        }
        
        // Si solo cambia la foto
        if (profileData.photoURL !== undefined) {
            return this.http.put(`${this.apiUrl}/perfil/${email}/imagen`, {
                photoURL: profileData.photoURL
            }).pipe(
                tap(() => console.log('✅ Foto actualizada')),
                switchMap(() => this.actualizarEstadoLocal(email, profileData))
            );
        }

        // Si cambian ambos, hacer dos llamadas
        return this.http.put(`${this.apiUrl}/perfil/${email}`, {
            username: profileData.username
        }).pipe(
            switchMap(() => this.http.put(`${this.apiUrl}/perfil/${email}/imagen`, {
                photoURL: profileData.photoURL
            })),
            switchMap(() => this.actualizarEstadoLocal(email, profileData))
        );
    }

    private actualizarEstadoLocal(email: string, profileData: ProfileUpdateData): Observable<any> {
        const currentUser = this.authState.getCurrentUser();
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                username: profileData.username || currentUser.username,
                photoURL: profileData.photoURL !== undefined
                    ? (profileData.photoURL === null ? undefined : profileData.photoURL)
                    : currentUser.photoURL
            };
            this.authState.setAuthenticatedUser(updatedUser);
        }
        return this.http.get(`${this.apiUrl}/perfil/${email}`);
    }

    /**
     * Eliminar imagen de perfil
     */
    removeProfileImage(email: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/perfil/${email}/imagen`).pipe(
            tap(() => console.log('✅ Imagen eliminada'))
        );
    }
}