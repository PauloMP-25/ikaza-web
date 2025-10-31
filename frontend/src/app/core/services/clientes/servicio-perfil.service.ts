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
    displayName?: string;
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
     * Actualizar perfil del usuario
     */
    updateProfile(email: string, profileData: ProfileUpdateData): Observable<any> {
        return this.http.put(`${this.apiUrl}/perfil/${email}`, profileData).pipe(
            tap(() => console.log('✅ Perfil actualizado')),
            switchMap(() => {
                // Actualizar el estado local
                const currentUser = this.authState.getCurrentUser();
                if (currentUser) {
                    const updatedUser = {
                        ...currentUser,
                        displayName: profileData.displayName || currentUser.username,
                        // Convertir null a undefined para compatibilidad con UserData
                        photoURL: profileData.photoURL !== undefined
                            ? (profileData.photoURL === null ? undefined : profileData.photoURL)
                            : currentUser.photoURL,
                        // Convertir null a undefined para compatibilidad con UserData
                        customIcon: profileData.customIcon !== undefined
                            ? (profileData.customIcon === null ? undefined : profileData.customIcon)
                            : currentUser.customIcon
                    };
                    this.authState.setAuthenticatedUser(updatedUser);
                }
                return this.http.get(`${this.apiUrl}/perfil/${email}`);
            })
        );
    }

    /**
     * Subir imagen de perfil
     */
    uploadProfileImage(email: string, base64Image: string): Observable<string> {
        return this.http.post<{ url: string }>(`${this.apiUrl}/perfil/${email}/imagen`, {
            image: base64Image
        }).pipe(
            tap(response => console.log('✅ Imagen subida:', response.url)),
            switchMap(response => {
                // Actualizar photoURL en el perfil
                return this.updateProfile(email, { photoURL: response.url }).pipe(
                    switchMap(() => this.http.get<string>(`${this.apiUrl}/perfil/${email}/imagen`))
                );
            })
        );
    }

    /**
     * Eliminar imagen de perfil
     */
    removeProfileImage(email: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/perfil/${email}/imagen`).pipe(
            tap(() => console.log('✅ Imagen eliminada')),
            switchMap(() => this.updateProfile(email, { photoURL: null }))
        );
    }
}