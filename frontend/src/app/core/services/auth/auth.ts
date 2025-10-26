// src/app/services/servicio-autenticacion/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { from, Observable, throwError } from 'rxjs';
import { switchMap, tap, finalize, catchError, map } from 'rxjs/operators';
import { Auth, signInWithCustomToken, updateProfile, sendEmailVerification, User } from '@angular/fire/auth';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';
// Servicios existentes
import { AuthStateService } from './auth.state';
import { FirebaseAuthService } from '../firebase/firebase-auth.service';

// Importar ClienteService para el paso 2 (Creación de perfil)
import { ClienteService } from '../clientes/cliente.service';
import { MessageResponse } from '@core/models/usuarios/usuario-model';

// Modelos
import { UserData } from '@core/models/auth-firebase/user-data';
import { LoginCredentials } from '@core/models/auth-firebase/login-credentials';
import { RegisterData } from '@core/models/auth-firebase/register-data';
import { AuthResponse, RegistroBackendRequest } from '@core/models/auth-firebase/auth-request-backend';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private firebaseAuth = inject(FirebaseAuthService);
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private auth = inject(Auth);
  private cliente = inject(ClienteService);
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private redirectUrl: string | null = null;
  // 🆕 Propiedad para almacenar el resultado de la confirmación SMS
  private confirmationResult: ConfirmationResult | null = null;
  // Exponer propiedades del estado
  currentUser = this.authState.currentUser;
  isLoading = this.authState.isLoading;
  user$ = this.authState.user$;


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
        console.log('✅ Registro Backend exitoso. Custom Token recibido.');

        // 1. Usar Custom Token para iniciar sesión en Firebase Auth
        return from(signInWithCustomToken(this.auth, authResponse.token)).pipe(
          switchMap((userCredential) => {
            const user = userCredential.user; // Obtener el objeto User
            const uid = user.uid;

            // 🚨 CORRECCIÓN: Llamar a la función updateProfile(user, { displayName: ... })
            return from(updateProfile(user, { // <-- AQUÍ ESTÁ EL CAMBIO
              displayName: registerData.username
            })).pipe(
              switchMap(() => {
                // 2. Crear el registro Cliente de forma desacoplada
                return this.crearPerfilInicial(uid).pipe(
                  map(() => authResponse.mensaje)
                );
              })
            );
          })
        );
      }),
      // Manejo de errores simplificado
      catchError((error) => {
        const errorMessage = error.error?.mensaje || error.message || 'Error al registrar usuario';
        this.authState.authError.set(errorMessage);
        // Asegurar logout de Firebase si el registro falló en la BD (aunque el CustomToken debería fallar)
        this.firebaseAuth.logout().subscribe();
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => {
        this.authState.isLoading.set(false);
      })
    );
  }

  /**
    * LOGIN con email/password (Flujo de verificación)
    */
  login(credentials: LoginCredentials): Observable<UserData> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    return this.firebaseAuth.loginWithEmail(credentials).pipe(
      switchMap((result) => {
        // Obtener ID Token de Firebase
        return from(result.user.getIdToken()).pipe(
          // 🚨 CAMBIO CRÍTICO 4: Llamar al nuevo endpoint /login-token
          switchMap((idToken) => this.verificarLoginEnBackend(idToken))
        );
      }),
      // 🚨 CAMBIO CRÍTICO 5: Eliminar el flujo de sincronización de Firestore (ya no se usa)
      // Mantener solo la redirección
      map(() => {
        // Forzar la recarga de los datos de AuthStateService para que cargue el estado de seguridad
        this.authState.refreshCurrentUser().subscribe();
        // Asumimos que AuthStateService eventualmente obtiene la información de rol/isAdmin
        return this.authState.getCurrentUser() as UserData;
      }),
      tap((userData) => {
        this.redirectUserByRole(userData);
      }),
      catchError((error) => {
        console.error('❌ Error completo en login:', error);
        const errorMessage = error.message || 'Error al iniciar sesión';
        this.authState.authError.set(errorMessage);

        this.firebaseAuth.logout().subscribe();
        throw error;
      }),
      finalize(() => {
        console.log('🏁 Proceso de login finalizado');
        this.authState.isLoading.set(false);
      })
    );
  }


  /**
     * 🆕 LOGIN con Google (Flujo de verificación)
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
      // 🚨 CAMBIO CRÍTICO 6: Usar el mismo patrón que Login Email/Pass
      map(() => {
        this.authState.refreshCurrentUser().subscribe();
        return this.authState.getCurrentUser() as UserData;
      }),
      tap((userData) => {
        this.redirectUserByRole(userData);
      }),
      catchError((error) => {
        console.error('❌ Error en login con Google:', error);
        const errorMessage = error.error?.mensaje || error.message || 'Error al iniciar sesión con Google';
        this.authState.authError.set(errorMessage);
        throw new Error(errorMessage);
      }),
      finalize(() => {
        this.authState.isLoading.set(false);
      })
    );
  }

  /**
     * 🆕 Llamada al nuevo endpoint de Login/Sincronización
     * POST /api/auth/login-token
     */
  private verificarLoginEnBackend(idToken: string): Observable<AuthResponse> {
    console.log('🔐 Verificando y sincronizando token en backend...');
    const requestBody = { idToken: idToken }; // Usamos el DTO LoginTokenRequest

    return this.http.post<AuthResponse>(`${this.apiUrl}/login-token`, requestBody).pipe(
      tap((response) => {
        console.log('✅ Login Token exitoso:', response);
        localStorage.setItem('authToken', idToken);
        // NOTA: La entidad Cliente (perfil) debe ser creada en el backend para Social Login
        // o el frontend debe verificar si existe y crearla si es necesario.
      }),
      catchError((error) => {
        console.error('❌ Error verificando token en backend:', error);
        throw error;
      })
    );
  }

  /**
   * 🆕 PASO 2 DEL REGISTRO: Crea la entidad Cliente inicial.
   * POST /api/clientes/crear-perfil/{firebaseUid}
   */
  private crearPerfilInicial(uid: string): Observable<MessageResponse> {
    console.log('📝 Creando registro Cliente inicial (Perfil).');
    // El body puede ser vacío o contener datos mínimos iniciales
    return this.http.post<MessageResponse>(`${environment.apiUrl}/api/clientes/crear-perfil/${uid}`, {}).pipe(
      tap(() => {
        console.log('✅ Entidad Cliente creada exitosamente.');
      }),
      catchError((error) => {
        console.error('❌ Error creando perfil Cliente:', error);
        // Este error no debería detener el flujo si el Auth ya fue exitoso, pero lo registramos.
        return throwError(() => new Error('Error al crear el perfil de cliente inicial.'));
      })
    );
  }

  /**
   * Logout
   */
  logout(): Observable<void> {
    const currentUser = this.currentUser();

    // Notificar al backend (opcional)
    if (currentUser) {
      this.http.post(`${this.apiUrl}/logout?firebaseUid=${currentUser.uid}`, {})
        .subscribe({
          next: () => console.log('✅ Logout registrado en backend'),
          error: (err) => console.warn('⚠️ Error en logout backend:', err)
        });
    }

    return this.firebaseAuth.logout().pipe(
      tap(() => {
        // Limpiar localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');

        // Limpiar estado
        this.authState.currentUser.set(null);

        // Redirigir
        this.router.navigate(['/']);
      })
    );
  }

  /**
     * 🆕 Envía el correo de verificación de Firebase al usuario actualmente autenticado.
     */
  sendVerificationEmail(): Observable<void> {
    const firebaseUser = this.auth.currentUser;

    if (!firebaseUser) {
      return throwError(() => new Error('No hay usuario de Firebase logueado.'));
    }

    // Llamar a la función de Firebase para enviar el correo
    return from(sendEmailVerification(firebaseUser)).pipe(
      tap(() => {
        console.log('✅ Correo de verificación enviado a:', firebaseUser.email);
      }),
      catchError((error) => {
        console.error('❌ Error al enviar correo de verificación:', error);
        // Manejar errores de límite de envío, etc.
        if (error.code === 'auth/too-many-requests') {
          return throwError(() => new Error('Has solicitado muchos correos. Intenta más tarde.'));
        }
        return throwError(() => new Error('Error al enviar el correo de verificación.'));
      })
    );
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  /**
   * Verificar si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.authState.isAdmin();
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): UserData | null {
    return this.authState.getCurrentUser();
  }

  /**
   * Obtener usuario actual de Firebase Auth
   */
  getFirebaseCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  refreshUser(): Observable<UserData | null> {
    return this.authState.refreshCurrentUser();
  }

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
   * 🆕 Obtener el token ID de Firebase para el usuario actual
   * Este método es usado por el interceptor
   */
  getIdToken(): Observable<string | null> {
    return new Observable(observer => {
      const currentUser = this.auth.currentUser;

      if (!currentUser) {
        console.log('👤 No hay usuario autenticado para obtener token');
        observer.next(null);
        observer.complete();
        return;
      }

      console.log('🔑 Obteniendo token para usuario:', currentUser.uid);

      from(currentUser.getIdToken()).subscribe({
        next: (token) => {
          console.log('✅ Token obtenido exitosamente');
          observer.next(token);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error al obtener token:', error);
          observer.next(null); // Devolver null en caso de error
          observer.complete();
        }
      });
    });
  }

  /**
   * 🆕 Verificar estado de autenticación actual
   */
  checkAuthState(): Observable<boolean> {
    return new Observable(observer => {
      this.auth.onAuthStateChanged((user) => {
        const isAuthenticated = !!user;
        console.log('🔐 Estado de autenticación:', isAuthenticated ? 'Autenticado' : 'No autenticado');
        observer.next(isAuthenticated);
        observer.complete();
      });
    });
  }


  /**
  * 🆕 PASO 1: Envía el código SMS al número de teléfono.
  */
  sendSmsCode(phoneNumber: string, appVerifier: RecaptchaVerifier): Observable<void> {
    return from(signInWithPhoneNumber(this.auth, phoneNumber, appVerifier)).pipe(
      tap(result => {
        this.confirmationResult = result;
        console.log('✅ Código SMS enviado. Esperando verificación.');
      }),
      map(() => void 0) // Retorna void
    );
  }

  /**
   * 🆕 PASO 2: Verifica el código SMS.
   */
  verifySmsCode(code: string): Observable<void> {
    if (!this.confirmationResult) {
      return throwError(() => new Error('No se ha solicitado ningún código de verificación.'));
    }

    return from(this.confirmationResult.confirm(code)).pipe(
      tap(() => {
        this.confirmationResult = null; // Limpiar después de éxito
        console.log('✅ Verificación de código SMS exitosa.');
      }),
      map(() => void 0), // Retorna void
      catchError(error => {
        if (error.code === 'auth/invalid-verification-code') {
          return throwError(() => new Error('Código de verificación incorrecto.'));
        }
        return throwError(() => error);
      })
    );
  }
}