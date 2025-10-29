// src/app/core/services/auth/password.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * ============================================================================
 * SERVICIO DE GESTIÓN DE CONTRASEÑAS
 * ============================================================================
 * Maneja el cambio de contraseña directamente con el backend
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})
export class PasswordService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/auth`;

    /**
     * Cambiar contraseña del usuario
     */
    changePassword(currentPassword: string, newPassword: string): Observable<void> {
        const requestBody = {
            currentPassword,
            newPassword
        };

        return this.http.post<void>(`${this.apiUrl}/cambiar-password`, requestBody).pipe(
            tap(() => console.log('✅ Contraseña cambiada exitosamente')),
            catchError(error => {
                console.error('❌ Error al cambiar contraseña:', error);

                let errorMessage = 'Error al cambiar la contraseña';

                if (error.status === 401) {
                    errorMessage = 'La contraseña actual es incorrecta';
                } else if (error.status === 400) {
                    errorMessage = error.error?.mensaje || 'La nueva contraseña no cumple los requisitos';
                } else if (error.error?.mensaje) {
                    errorMessage = error.error.mensaje;
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * Validar fortaleza de contraseña (frontend)
     */
    validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
        strength: 'weak' | 'medium' | 'strong';
    } {
        const errors: string[] = [];
        let score = 0;

        // Longitud mínima
        if (password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        } else if (password.length >= 8) {
            score += 1;
        }

        // Mayúsculas
        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos una letra mayúscula');
        }

        // Minúsculas
        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos una letra minúscula');
        }

        // Números
        if (/[0-9]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos un número');
        }

        // Caracteres especiales
        if (/[^A-Za-z0-9]/.test(password)) {
            score += 1;
        }

        let strength: 'weak' | 'medium' | 'strong' = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 2) strength = 'medium';

        return {
            isValid: password.length >= 6,
            errors: errors,
            strength: strength
        };
    }
}