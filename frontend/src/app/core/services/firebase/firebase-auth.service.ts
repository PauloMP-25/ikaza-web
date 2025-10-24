/* 
Login con email/password
Login con Google
Registro de usuarios
Envío de verificación de email
Logout
Manejo centralizado de errores 
*/

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendEmailVerification,
    signOut,
    User,
    UserCredential
} from 'firebase/auth';

import { FirebaseConfigService } from './firebase-config.service';
import { LoginCredentials } from '@core/models/auth-firebase/login-credentials';
import { RegisterData } from '@core/models/auth-firebase/register-data';

@Injectable({
    providedIn: 'root'
})
export class FirebaseAuthService {
    private firebaseConfig = inject(FirebaseConfigService);
    private googleProvider = new GoogleAuthProvider();

    constructor() {
        // Configurar scopes adicionales para Google si es necesario
        this.googleProvider.addScope('profile');
        this.googleProvider.addScope('email');
    }

    /**
     * Login con email y contraseña
     */
    loginWithEmail(credentials: LoginCredentials): Observable<UserCredential> {
        return from(
            signInWithEmailAndPassword(
                this.firebaseConfig.auth,
                credentials.email,
                credentials.password
            )
        ).pipe(
            catchError(error => {
                console.log(error);
                throw this.handleAuthError(error);
            })
        );
    }

    /**
     * Login con Google
     */
    loginWithGoogle(): Observable<UserCredential> {
        return from(
            signInWithPopup(this.firebaseConfig.auth, this.googleProvider)
        ).pipe(
            catchError(error => {
                console.error('Error en login con Google:', error);
                throw this.handleAuthError(error);
            })
        );
    }

    /**
     * Registro con email y contraseña
     */
    registerWithEmail(registerData: RegisterData): Observable<UserCredential> {
        if (registerData.password !== registerData.confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
        }

        return from(
            createUserWithEmailAndPassword(
                this.firebaseConfig.auth,
                registerData.email,
                registerData.password
            )
        ).pipe(
            catchError(error => {
                throw this.handleAuthError(error);
            })
        );
    }

    /**
     * Enviar email de verificación
     */
    sendEmailVerification(user: User): Observable<void> {
        return from(sendEmailVerification(user)).pipe(
            catchError(error => {
                console.error('Error enviando email de verificación:', error);
                throw this.handleAuthError(error);
            })
        );
    }

    /**
     * Cerrar sesión
     */
    logout(): Observable<void> {
        return from(signOut(this.firebaseConfig.auth)).pipe(
            catchError(error => {
                console.error('Error al cerrar sesión:', error);
                throw this.handleAuthError(error);
            })
        );
    }

    /**
     * Obtener usuario actual de Firebase Auth
     */
    getCurrentFirebaseUser(): User | null {
        return this.firebaseConfig.auth.currentUser;
    }

    /**
     * Manejo centralizado de errores de Firebase Auth
     */
    private handleAuthError(error: any): Error {
        let errorMessage = 'Error de autenticación';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'El correo no es válido';
                break;
            case 'auth/user-disabled':
                errorMessage = 'El usuario ha sido deshabilitado';
                break;
            case 'auth/user-not-found':
                errorMessage = 'El usuario no existe';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Credenciales inválidas';
                break;
            case 'auth/email-already-in-use':
                errorMessage = 'El correo ya está en uso';
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña debe tener al menos 6 caracteres';
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = 'Login cancelado por el usuario';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Popup bloqueado por el navegador';
                break;
            default:
                errorMessage = error.message || 'Error desconocido';
        }

        return new Error(errorMessage);
    }
}