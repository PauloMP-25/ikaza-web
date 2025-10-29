// src/app/core/services/auth/auth-state.service.ts
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserData, AuthState, AuthStateInfo } from '@core/models/auth/auth.models';

/**
 * ============================================================================
 * SERVICIO DE ESTADO DE AUTENTICACIÓN (Sin Firebase)
 * ============================================================================
 * Gestiona el estado reactivo del usuario autenticado usando:
 * - Signals de Angular (para estado síncrono)
 * - BehaviorSubjects (para compatibilidad con Observables)
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})
export class AuthStateService {
    // ============================================================================
    // SIGNALS (Estado reactivo síncrono)
    // ============================================================================
    currentUser = signal<UserData | null>(null);
    isLoading = signal<boolean>(false);
    authError = signal<string | null>(null);

    // ============================================================================
    // BEHAVIORSUBJECTS (Para compatibilidad con Observables)
    // ============================================================================
    private userSubject = new BehaviorSubject<UserData | null>(null);
    private authStateSubject = new BehaviorSubject<AuthStateInfo>({
        state: AuthState.UNAUTHENTICATED,
        user: null,
        loading: false,
        error: null
    });

    // ============================================================================
    // OBSERVABLES PÚBLICOS
    // ============================================================================
    public user$ = this.userSubject.asObservable();
    public authState$ = this.authStateSubject.asObservable();

    // ============================================================================
    // MÉTODOS DE ACTUALIZACIÓN DE ESTADO
    // ============================================================================

    /**
     * Establecer usuario autenticado
     */
    setAuthenticatedUser(userData: UserData): void {
        this.currentUser.set(userData);
        this.userSubject.next(userData);
        this.updateAuthState(AuthState.AUTHENTICATED, userData, false, null);
        console.log('✅ Usuario autenticado:', userData.email);
    }

    /**
     * Limpiar usuario autenticado
     */
    clearAuthenticatedUser(): void {
        this.currentUser.set(null);
        this.userSubject.next(null);
        this.updateAuthState(AuthState.UNAUTHENTICATED, null, false, null);
        console.log('🔓 Usuario desautenticado');
    }

    /**
     * Actualizar estado de autenticación
     */
    private updateAuthState(
        state: AuthState,
        user: UserData | null,
        loading: boolean,
        error: string | null
    ): void {
        this.authStateSubject.next({ state, user, loading, error });
    }

    /**
     * Establecer estado de carga
     */
    setLoading(loading: boolean): void {
        this.isLoading.set(loading);
        const currentState = this.authStateSubject.value;
        this.authStateSubject.next({ ...currentState, loading });
    }

    /**
     * Establecer error de autenticación
     */
    setAuthError(error: string | null): void {
        this.authError.set(error);
        if (error) {
            const currentState = this.authStateSubject.value;
            this.authStateSubject.next({
                ...currentState,
                state: AuthState.ERROR,
                error
            });
        }
    }

    /**
     * Limpiar error de autenticación
     */
    clearAuthError(): void {
        this.authError.set(null);
        const currentState = this.authStateSubject.value;
        if (currentState.error) {
            this.authStateSubject.next({ ...currentState, error: null });
        }
    }

    // ============================================================================
    // GETTERS (SÍNCRONOS)
    // ============================================================================

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
}