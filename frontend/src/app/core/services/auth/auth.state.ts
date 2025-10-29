// src/app/services/auth/auth-state.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, catchError, from, map, Observable, of, switchMap, tap } from 'rxjs';
import { getIdTokenResult, IdTokenResult, onAuthStateChanged, User } from 'firebase/auth';

import { FirebaseConfigService } from '../firebase/firebase-config.service';
import { UserDataService } from '../firebase/user-data.service';
import { UserData } from '@core/models/auth-firebase/auth.state.models';
import { AuthState, AuthStateInfo } from '@core/models/auth-firebase/auth.state.models';
import { Auth } from '@angular/fire/auth';
@Injectable({
    providedIn: 'root'
})
export class AuthStateService {
    // ============================================================================
    // INYECCIÓN DE DEPENDENCIAS
    // ============================================================================
    private firebaseConfig = inject(FirebaseConfigService);
    private userDataService = inject(UserDataService);
    private auth = inject(Auth);

    // ============================================================================
    // Signals para el estado reactivo
    // ============================================================================
    currentUser = signal<UserData | null>(null);
    isLoading = signal<boolean>(false);
    authError = signal<string | null>(null);

    // ============================================================================
    // BEHAVIORSUBJECTS PARA COMPATIBILIDAD CON OBSERVABLES
    // ============================================================================
    private userSubject = new BehaviorSubject<UserData | null>(null);
    private authStateSubject = new BehaviorSubject<AuthStateInfo>({
        state: AuthState.LOADING,
        user: null,
        loading: true,
        error: null
    });

    // ============================================================================
    // OBSERVABLES PUBLICOS
    // ============================================================================
    public user$ = this.userSubject.asObservable();
    public authState$ = this.authStateSubject.asObservable();

    // ============================================================================
    // CONSTRUCTOR - Inicializar listeners
    // ============================================================================
    constructor() {
        this.initializeAuthListener();
    }

    // ============================================================================
    // INICIALIZACIÓN - VERSIÓN REACTIVA
    // ============================================================================
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
                    // Utilizamos async/await con una Promise para mantener el flujo del listener
                    const userData = await new Promise<UserData | null>((resolve, reject) => {
                        this.refreshCurrentUser(firebaseUser)
                            .subscribe({
                                next: resolve,
                                error: reject
                            });
                    });

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

    // ============================================================================
    // ACTUALIZACION DE ESTADOS
    // ============================================================================
    /**
     * Establecer usuario autenticado (Actualiza Signals y Subjects)
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
     * Forzar refresh del usuario actual (Obtiene claims y luego perfil de Firestore)
     */
    refreshCurrentUser(firebaseUser?: User): Observable<UserData | null> {
        const user = firebaseUser || this.auth.currentUser;

        if (user && user.emailVerified) {
            // 1. Obtener Custom Claims
            return from(getIdTokenResult(user)).pipe(
                // 2. Imprimir claims para testing
                tap((tokenResult: IdTokenResult) => {
                    console.log('--- FIREBASE CLAIMS (TESTING) ---');
                    console.log('UID:', user.uid);
                    console.log('Email:', user.email);
                    console.log('Claims:', tokenResult.claims);
                    console.log('----------------------------------');
                }),// 3. Mapear claims y obtener datos de perfil
                switchMap((tokenResult: IdTokenResult) => {
                    const rolFromClaims = tokenResult.claims['rol'] as string || 'CLIENTE';
                    const isAdmin = rolFromClaims === 'ADMINISTRADOR';

                    // 4. Obtener datos de perfil (Firestore)
                    return this.userDataService.getUserData(user).pipe(
                        map((firestoreData) => {
                            if (!firestoreData) {
                                return null;
                            }
                            // 5. Combinar datos de Firestore con isAdmin de Claims
                            return {
                                ...firestoreData,
                                isAdmin: isAdmin //ROL VIENE DEL CLAIM
                            } as UserData;
                        })
                    );
                }),
                // 6. Actualizar estado interno y emitir el valor
                tap((userData) => {
                    if (userData) {
                        // Llama a setAuthenticatedUser para actualizar Signals/Subjects
                        this.setAuthenticatedUser(userData);
                        this.updateAuthState(AuthState.AUTHENTICATED, userData, false, null);
                    }
                }),
                catchError((error) => {
                    console.error('Error al refrescar datos del usuario:', error);
                    // Si falla el refresh, limpiamos el estado para evitar datos inconsistentes
                    this.clearAuthenticatedUser();
                    return of(null);
                })
            );
        }

        // Si no hay usuario de Firebase, limpiar y devolver Observable<null>
        this.clearAuthenticatedUser();
        return of(null);
    }

    // ============================================================================
    // OBTENCION DE DATOS (GETTERS)
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

    // ============================================================================
    // LIMPIEZA DE ESTADOS
    // ============================================================================

    /**
    * Limpiar usuario autenticado
    */
    private clearAuthenticatedUser(): void {
        this.currentUser.set(null);
        this.userSubject.next(null);
        localStorage.removeItem('authToken'); // Limpiar cualquier token local
    }

    /**
     * Limpiar error de autenticación
     */
    clearAuthError(): void {
        this.authError.set(null);
    }
}