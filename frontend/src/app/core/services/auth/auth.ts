// src/app/services/servicio-autenticacion/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { from, Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { switchMap, tap, finalize, catchError, map, shareReplay, distinctUntilChanged } from 'rxjs/operators';
import {
  Auth,
  getIdTokenResult,
  signInWithCustomToken,
  updateProfile,
  sendEmailVerification,
  User,
  IdTokenResult
} from '@angular/fire/auth';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';

// Servicios existentes
import { AuthStateService } from './auth.state';
import { FirebaseAuthService } from '../firebase/firebase-auth.service';
import { ClienteService } from '../clientes/cliente.service';

// Modelos
import { UserData } from '@core/models/auth-firebase/user-data';
import { LoginCredentials } from '@core/models/auth-firebase/auth.backend.models';
import { RegisterData } from '@core/models/auth-firebase/auth.backend.models';
import { AuthResponse, RegistroBackendRequest } from '@core/models/auth-firebase/auth.models';
import { MessageResponse } from '@core/models/usuarios/usuario-model';

/**
 * 
 * Servicio de autenticación 100% reactivo y profesional.
 * 
 * ARQUITECTURA REACTIVA:
 *    - Todos los métodos importantes retornan Observables
 *    - Uso de BehaviorSubjects para estado en tiempo real
 *    - Optimización con shareReplay() para evitar llamadas duplicadas
 * 
 * MÉTODOS PRINCIPALES (REACTIVE):
 *    - isAuthenticated$()      → Observable<boolean>
 *    - getCurrentUser$()       → Observable<UserData | null>
 *    - getIdToken$()           → Observable<string | null>
 *    - getIdTokenResult$()     → Observable<IdTokenResult>
 * 
 * GESTIÓN AVANZADA:
 *    - Control total del ciclo de vida del token
 *    - Manejo robusto de sesiones expiradas
 *    - Logout limpio (Firebase + Backend + LocalStorage)
 *    - Redirecciones inteligentes por rol
 * 
 *  MÉTODOS DEPRECATED (para eliminar gradualmente):
 *    - isAuthenticated()       → Usar isAuthenticated$()
 *    - getCurrentUser()        → Usar getCurrentUser$()
 *    - getFirebaseCurrentUser() → Usar getCurrentUser$()
 * 
 * ============================================================================
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private http = inject(HttpClient);
  private firebaseAuth = inject(FirebaseAuthService);
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private auth = inject(Auth);
  private cliente = inject(ClienteService);

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private redirectUrl: string | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  // ============================================================================
  // SUBJECTS INTERNOS PARA ESTADO REACTIVO
  // ============================================================================
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private tokenResultSubject = new BehaviorSubject<IdTokenResult | null>(null);

  // ============================================================================
  // PROPIEDADES PÚBLICAS (del AuthStateService)
  // ============================================================================
  currentUser = this.authState.currentUser;
  isLoading = this.authState.isLoading;
  user$ = this.authState.user$;

  // ============================================================================
  // CONSTRUCTOR - Inicializar listeners
  // ============================================================================
  constructor() {
    this.initializeTokenListener();
  }

  // ============================================================================
  // MÉTODOS REACTIVOS ENTERPRISE-LEVEL
  // ============================================================================

  /**
   * Verifica si el usuario está autenticado
   * @returns Observable<boolean> - true si hay usuario autenticado
   */
  isAuthenticated$(): Observable<boolean> {
    return this.user$.pipe(
      map(user => user !== null),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * Obtiene el usuario actual
   * @returns Observable<UserData | null> - Datos del usuario o null
   */
  getCurrentUser$(): Observable<UserData | null> {
    return this.user$.pipe(
      distinctUntilChanged((prev, curr) => prev?.uid === curr?.uid),
      shareReplay(1)
    );
  }

  /**
   * Obtiene el token ID de Firebase
   * @returns Observable<string | null> - Token de Firebase o null
   */
  getIdToken$(): Observable<string | null> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      this.tokenSubject.next(null);
      return of(null);
    }

    return from(currentUser.getIdToken()).pipe(
      tap(token => this.tokenSubject.next(token)),
      catchError(error => {
        console.error('❌ Error obteniendo token:', error);
        this.tokenSubject.next(null);
        return of(null);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene el resultado completo del token (incluye expiración y claims)
   * @returns Observable<IdTokenResult> - Información completa del token
   */
  getIdTokenResult$(): Observable<IdTokenResult> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay usuario autenticado'));
    }

    return from(getIdTokenResult(currentUser)).pipe(
      tap(result => {
        this.tokenResultSubject.next(result);
        console.log('🔍 Token Result obtenido:', {
          expirationTime: result.expirationTime,
          issuedAtTime: result.issuedAtTime,
          claims: result.claims
        });
      }),
      catchError(error => {
        console.error('❌ Error obteniendo IdTokenResult:', error);
        this.tokenResultSubject.next(null);
        return throwError(() => error);
      }),
      shareReplay(1)
    );
  }

  // ============================================================================
  // GESTIÓN DE REDIRECCIONES
  // ============================================================================

  /**
   * Establecer URL de redirección después del login
   */
  setRedirectUrl(url: string): void {
    this.redirectUrl = url;
  }

  /**
   * Obtener y limpiar URL de redirección
   */
  getAndClearRedirectUrl(): string | null {
    const url = this.redirectUrl;
    this.redirectUrl = null;
    return url;
  }

  // ============================================================================
  // REGISTRO DE USUARIOS
  // ============================================================================

  /**
   * REGISTRO con backend (Flujo de dos pasos)
   * 1. Backend crea usuario en Firebase y devuelve Custom Token.
   * 2. Frontend usa Custom Token para loguear en Firebase.
   * 3. Frontend llama al ClienteService para crear la entidad Cliente (perfil inicial).
   */
  register(registerData: RegisterData): Observable<string> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    const backendRequest: RegistroBackendRequest = {
      email: registerData.email,
      password: registerData.password,
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, backendRequest).pipe(
      switchMap((authResponse: AuthResponse) => {
        console.log('Registro Backend exitoso. Custom Token recibido.');

        return from(signInWithCustomToken(this.auth, authResponse.token)).pipe(
          switchMap((userCredential) => {
            const user = userCredential.user;
            const uid = user.uid;

            return from(updateProfile(user, {
              displayName: registerData.username
            })).pipe(
              switchMap(() => this.crearPerfilInicial(uid).pipe(
                map(() => authResponse.mensaje)
              ))
            );
          })
        );
      }),
      catchError((error) => {
        const errorMessage = error.error?.mensaje || error.message || 'Error al registrar usuario';
        this.authState.authError.set(errorMessage);
        this.firebaseAuth.logout().subscribe();
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        this.authState.isLoading.set(false);
      })
    );
  }

  // ============================================================================
  // LOGIN DE USUARIOS
  // ============================================================================

  /**
   * LOGIN con email/password (Flujo de verificación)
   */
  login(credentials: LoginCredentials): Observable<UserData> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    return this.firebaseAuth.loginWithEmail(credentials).pipe(
      switchMap((result) => {
        return from(result.user.getIdToken()).pipe(
          switchMap((idToken) => this.verificarLoginEnBackend(idToken))
        );
      }),
      map(() => {
        this.authState.refreshCurrentUser().subscribe();
        return this.authState.getCurrentUser() as UserData;
      }),
      tap((userData) => {
        this.redirectUserByRole(userData);
      }),
      catchError((error) => {
        console.error('Error completo en login:', error);
        const errorMessage = error.message || 'Error al iniciar sesión';
        this.authState.authError.set(errorMessage);
        this.firebaseAuth.logout().subscribe();
        throw error;
      }),
      finalize(() => {
        console.log('Proceso de login finalizado');
        this.authState.isLoading.set(false);
      })
    );
  }

  /**
   * LOGIN con Google (Flujo de verificación)
   */
  loginWithGoogle(): Observable<UserData> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    return this.firebaseAuth.loginWithGoogle().pipe(
      switchMap((result) => {
        return from(result.user.getIdToken()).pipe(
          switchMap((idToken) => this.verificarLoginEnBackend(idToken))
        );
      }),
      map(() => {
        this.authState.refreshCurrentUser().subscribe();
        return this.authState.getCurrentUser() as UserData;
      }),
      tap((userData) => {
        this.redirectUserByRole(userData);
      }),
      catchError((error) => {
        console.error('Error en login con Google:', error);
        const errorMessage = error.error?.mensaje || error.message || 'Error al iniciar sesión con Google';
        this.authState.authError.set(errorMessage);
        throw new Error(errorMessage);
      }),
      finalize(() => {
        this.authState.isLoading.set(false);
      })
    );
  }

  // ============================================================================
  // LOGOUT
  // ============================================================================

  /**
   * Logout completo (Firebase + Backend + LocalStorage)
   */
  logout(): Observable<void> {
    const currentUser = this.currentUser();

    // Notificar al backend (opcional)
    if (currentUser) {
      this.http.post(`${this.apiUrl}/logout?firebaseUid=${currentUser.uid}`, {})
        .subscribe({
          next: () => console.log('Logout registrado en backend'),
          error: (err) => console.warn('Error en logout backend:', err)
        });
    }

    return this.firebaseAuth.logout().pipe(
      tap(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');

        this.tokenSubject.next(null);
        this.tokenResultSubject.next(null);

        this.authState.currentUser.set(null);

        this.router.navigate(['/home']);
      })
    );
  }

  // ============================================================================
  // VERIFICACIÓN DE EMAIL
  // ============================================================================

  /**
   * Envía el correo de verificación de Firebase al usuario actualmente autenticado.
   */
  sendVerificationEmail(): Observable<void> {
    const firebaseUser = this.auth.currentUser;

    if (!firebaseUser) {
      return throwError(() => new Error('No hay usuario de Firebase logueado.'));
    }

    return from(sendEmailVerification(firebaseUser)).pipe(
      tap(() => {
        console.log('Correo de verificación enviado a:', firebaseUser.email);
      }),
      catchError((error) => {
        console.error('Error al enviar correo de verificación:', error);
        if (error.code === 'auth/too-many-requests') {
          return throwError(() => new Error('Has solicitado muchos correos. Intenta más tarde.'));
        }
        return throwError(() => new Error('Error al enviar el correo de verificación.'));
      })
    );
  }

  // ============================================================================
  // AUTENTICACIÓN POR SMS
  // ============================================================================

  /**
   * PASO 1: Envía el código SMS al número de teléfono.
   */
  sendSmsCode(phoneNumber: string, appVerifier: RecaptchaVerifier): Observable<void> {
    return from(signInWithPhoneNumber(this.auth, phoneNumber, appVerifier)).pipe(
      tap(result => {
        this.confirmationResult = result;
        console.log('Código SMS enviado. Esperando verificación.');
      }),
      map(() => void 0)
    );
  }

  /**
   * PASO 2: Verifica el código SMS.
   */
  verifySmsCode(code: string): Observable<void> {
    if (!this.confirmationResult) {
      return throwError(() => new Error('No se ha solicitado ningún código de verificación.'));
    }

    return from(this.confirmationResult.confirm(code)).pipe(
      tap(() => {
        this.confirmationResult = null;
        console.log('Verificación de código SMS exitosa.');
      }),
      map(() => void 0),
      catchError(error => {
        if (error.code === 'auth/invalid-verification-code') {
          return throwError(() => new Error('Código de verificación incorrecto.'));
        }
        return throwError(() => error);
      })
    );
  }

  // ============================================================================
  // ACTUALIZACIÓN DE USUARIO
  // ============================================================================

  /**
   * Refresca los datos del usuario actual
   */
  refreshUser(): Observable<UserData | null> {
    const user = this.authState.getCurrentUser();
    if (!user) {
      return of(null);
    }
    return this.authState.refreshCurrentUser().pipe(
      catchError(() => of(null))
    );
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Inicializar listener del token
   */
  private initializeTokenListener(): void {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        user.getIdToken().then(token => {
          this.tokenSubject.next(token);
        }).catch(() => {
          this.tokenSubject.next(null);
        });
      } else {
        this.tokenSubject.next(null);
      }
    });
  }

  /**
   * Verificar login en backend
   */
  private verificarLoginEnBackend(idToken: string): Observable<AuthResponse> {
    console.log('🔍 Verificando y sincronizando token en backend...');
    const requestBody = { idToken: idToken };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login-token`, requestBody).pipe(
      tap((response) => {
        console.log('Login Token exitoso:', response);
        localStorage.setItem('authToken', idToken);
      }),
      catchError((error) => {
        console.error('Error verificando token en backend:', error);
        throw error;
      })
    );
  }

  /**
   * Crear perfil inicial del cliente
   */
  private crearPerfilInicial(uid: string): Observable<MessageResponse> {
    console.log('Creando registro Cliente inicial (Perfil).');
    return this.http.post<MessageResponse>(`${environment.apiUrl}/api/clientes/crear-perfil/${uid}`, {}).pipe(
      tap(() => {
        console.log('Entidad Cliente creada exitosamente.');
      }),
      catchError((error) => {
        console.error('Error creando perfil Cliente:', error);
        return throwError(() => new Error('Error al crear el perfil de cliente inicial.'));
      })
    );
  }

  /**
   * Redirigir usuario según su rol
   */
  private redirectUserByRole(userData: UserData): void {
    const redirectUrl = this.getAndClearRedirectUrl();

    if (redirectUrl) {
      this.router.navigateByUrl(redirectUrl);
    } else if (userData.isAdmin) {
      this.router.navigate(['/panel-administrador']);
    } else {
      this.router.navigate(['/panel-usuario']);
    }
  }

  /**
   * Verificar si el usuario es administrador (síncrono)
  */
  isAdmin(): boolean {
    return this.authState.isAdmin();
  }

  /**
   * Verificar estado de autenticación actual (reactivo)
   */
  checkAuthState(): Observable<boolean> {
    return new Observable(observer => {
      this.auth.onAuthStateChanged((user) => {
        const isAuthenticated = !!user;
        console.log('🔍 Estado de autenticación:', isAuthenticated ? 'Autenticado' : 'No autenticado');
        observer.next(isAuthenticated);
        observer.complete();
      });
    });
  }
}