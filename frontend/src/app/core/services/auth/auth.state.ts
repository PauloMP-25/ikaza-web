// src/app/services/auth/auth-state.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { onAuthStateChanged, User } from 'firebase/auth';

import { FirebaseConfigService } from '../firebase/firebase-config.service';
import { UserDataService } from '../firebase/user-data.service';
import { UserData } from '@core/models/auth-firebase/user-data';
import { AuthState } from '@core/models/auth-firebase/auth-state';
import { AuthStateInfo } from '@core/models/auth-firebase/auth-state-info';

@Injectable({
    providedIn: 'root'
})
export class AuthStateService {
    private firebaseConfig = inject(FirebaseConfigService);
    private userDataService = inject(UserDataService);

    // Signals para estado reactivo
    currentUser = signal<UserData | null>(null);
    isLoading = signal<boolean>(false);
    authError = signal<string | null>(null);

    // BehaviorSubjects para compatibilidad con observables
    private userSubject = new BehaviorSubject<UserData | null>(null);
    private authStateSubject = new BehaviorSubject<AuthStateInfo>({
        state: AuthState.LOADING,
        user: null,
        loading: true,
        error: null
    });

    // Observables públicos
    public user$ = this.userSubject.asObservable();
    public authState$ = this.authStateSubject.asObservable();

    constructor() {
        this.initializeAuthListener();
    }

    /**
     * Inicializar listener del estado de autenticación
     */
    private initializeAuthListener(): void {
        onAuthStateChanged(this.firebaseConfig.auth, async (firebaseUser: User | null) => {
            this.isLoading.set(true);
            this.authError.set(null);

            try {
                if (firebaseUser && firebaseUser.emailVerified) {
                    // Usuario autenticado y verificado
                    const userData = await this.userDataService.getUserData(firebaseUser).toPromise();

                    if (userData) {
                        this.setAuthenticatedUser(userData);
                        this.updateAuthState(AuthState.AUTHENTICATED, userData, false, null);
                    }
                } else {
                    // Usuario no autenticado o no verificado
                    if (firebaseUser && !firebaseUser.emailVerified) {
                        // Si el usuario no ha verificado su email, cerrar sesión
                        await this.firebaseConfig.auth.signOut();
                    }

                    this.clearAuthenticatedUser();
                    this.updateAuthState(AuthState.UNAUTHENTICATED, null, false, null);
                }
            } catch (error) {
                console.error('Error en listener de autenticación:', error);
                this.authError.set('Error al verificar el estado de autenticación');
                this.updateAuthState(AuthState.ERROR, null, false, 'Error al verificar el estado de autenticación');
            } finally {
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Establecer usuario autenticado
     */
    private setAuthenticatedUser(userData: UserData): void {
        this.currentUser.set(userData);
        this.userSubject.next(userData);

        // Actualizar último login
        this.userDataService.updateUserData(userData.uid, {
            lastLogin: new Date()
        }).subscribe({
            error: (error) => console.warn('Error actualizando último login:', error)
        });
    }

    /**
     * Limpiar usuario autenticado
     */
    private clearAuthenticatedUser(): void {
        this.currentUser.set(null);
        this.userSubject.next(null);
        localStorage.removeItem('authToken'); // Limpiar cualquier token local
    }

    /**
     * Actualizar estado de autenticación
     */
    private updateAuthState(state: AuthState, user: UserData | null, loading: boolean, error: string | null): void {
        this.authStateSubject.next({
            state,
            user,
            loading,
            error
        });
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }

    /**
     * Verificar si el usuario es administrador
     */
    isAdmin(): boolean {
        const user = this.currentUser();
        return user ? user.isAdmin : false;
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser(): UserData | null {
        return this.currentUser();
    }

    /**
     * Obtener estado de carga
     */
    getLoadingState(): boolean {
        return this.isLoading();
    }

    /**
     * Obtener error de autenticación
     */
    getAuthError(): string | null {
        return this.authError();
    }

    /**
     * Limpiar error de autenticación
     */
    clearAuthError(): void {
        this.authError.set(null);
    }

    /**
     * Forzar refresh del usuario actual
     */
    refreshCurrentUser(): Observable<UserData | null> {
        const firebaseUser = this.firebaseConfig.auth.currentUser;

        if (firebaseUser && firebaseUser.emailVerified) {
            return this.userDataService.getUserData(firebaseUser);
        }

        return new Observable(observer => {
            observer.next(null);
            observer.complete();
        });
    }
}