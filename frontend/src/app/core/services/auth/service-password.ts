// src/app/services/servicio-password/service-password.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

// Importar configuración Firebase
import { FirebaseConfigService } from '../firebase/firebase-config.service';

@Injectable({
    providedIn: 'root'
})
export class PasswordService {

    private firebaseConfig = inject(FirebaseConfigService);

    /**
     * Cambia la contraseña del usuario
     */
    changePassword(currentPassword: string, newPassword: string): Observable<void> {
        const user = this.firebaseConfig.auth.currentUser;
        if (!user || !user.email) {
            return throwError(() => new Error('Usuario no autenticado o sin email'));
        }

        return from(this.performPasswordChange(user, currentPassword, newPassword));
    }

    /**
     * Valida la fortaleza de una contraseña
     */
    validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
        strength: 'weak' | 'medium' | 'strong';
    } {
        const errors: string[] = [];
        let score = 0;

        // Verificar longitud mínima
        if (password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        } else if (password.length >= 8) {
            score += 1;
        }

        // Verificar mayúsculas
        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos una letra mayúscula');
        }

        // Verificar minúsculas
        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos una letra minúscula');
        }

        // Verificar números
        if (/[0-9]/.test(password)) {
            score += 1;
        } else {
            errors.push('Incluye al menos un número');
        }

        // Verificar caracteres especiales
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

    // Método privado para el cambio de contraseña
    private async performPasswordChange(user: any, currentPassword: string, newPassword: string): Promise<void> {
        try {
            // Crear credenciales con la contraseña actual
            const credential = EmailAuthProvider.credential(user.email, currentPassword);

            // Re-autenticar usuario
            await reauthenticateWithCredential(user, credential);

            // Actualizar contraseña
            await updatePassword(user, newPassword);

            // Registrar el cambio en Firestore (opcional)
            await this.logPasswordChange(user.uid);

        } catch (error: any) {
            console.error('Error al cambiar contraseña:', error);

            // Manejar errores específicos
            if (error.code === 'auth/wrong-password') {
                throw new Error('La contraseña actual es incorrecta');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('La nueva contraseña es muy débil');
            } else if (error.code === 'auth/requires-recent-login') {
                throw new Error('Por seguridad, necesitas iniciar sesión nuevamente');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Demasiados intentos fallidos. Intenta más tarde');
            }

            throw error;
        }
    }

    private async logPasswordChange(userId: string): Promise<void> {
        try {
            const userDocRef = doc(this.firebaseConfig.firestore, 'users', userId);
            await updateDoc(userDocRef, {
                lastPasswordChange: new Date(),
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error al registrar cambio de contraseña:', error);
        }
    }
}