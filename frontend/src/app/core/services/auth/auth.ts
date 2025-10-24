// src/app/services/servicio-autenticacion/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';
import { switchMap, tap, finalize, catchError, map, filter, take } from 'rxjs/operators';
import { User } from 'firebase/auth';
import { Auth, user } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';

// Servicios existentes
import { UserDataService } from '../firebase/user-data.service';
import { AuthStateService } from './auth.state';
import { FirebaseAuthService } from '../firebase/firebase-auth.service';
import { ProfileService } from '../usuarios/servicio-perfil.service';
import { PasswordService } from './service-password';

// Modelos
import { UserData } from '@core/models/auth-firebase/user-data';
import { ProfileUpdateData } from '@core/models/auth-firebase/profile-update-data';
import { LoginCredentials } from '@core/models/auth-firebase/login-credentials';
import { RegisterData } from '@core/models/auth-firebase/register-data';
import { AuthResponse, RegistroBackendRequest } from '@core/models/auth-firebase/auth-request-backend';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);
  private firebaseAuth = inject(FirebaseAuthService);
  private userDataService = inject(UserDataService);
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private auth = inject(Auth);
  private profileService = inject(ProfileService);
  private passwordService = inject(PasswordService);

  private apiUrl = `${environment.apiUrl}/api/auth`;
  private redirectUrl: string | null = null;

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
  * REGISTRO con backend usa POST /api/auth/registro
  */
  register(registerData: RegisterData): Observable<string> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    // Preparar datos para el backend
    const displayName = registerData.username || registerData.email.split('@')[0];
    const nameParts = displayName.split(' ');

    const backendRequest: RegistroBackendRequest = {
      email: registerData.email,
      password: registerData.password,
      nombres: nameParts[0] || displayName,
      apellidos: nameParts.slice(1).join(' ') || ''
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, backendRequest).pipe(
      tap((response) => {
        console.log('Usuario registrado en backend:', response);

        // Guardar token en localStorage
        localStorage.setItem('authToken', response.token);

        // Crear UserData desde la respuesta del backend
        const userData: UserData = {
          uid: response.firebaseUid,
          email: response.email,
          username: response.nombreCompleto,
          displayName: response.nombreCompleto,
          isAdmin: response.isAdmin,
          emailVerified: false, // El usuario debe verificar su email
          createdAt: new Date(response.fechaCreacion)
        };

        // Actualizar estado
        this.authState.currentUser.set(userData);
      }),
      map((response) => response.mensaje),
      catchError((error) => {
        console.error('❌ Error en registro:', error);
        const errorMessage = error.error?.mensaje || error.message || 'Error al registrar usuario';
        this.authState.authError.set(errorMessage);
        throw new Error(errorMessage);
      }),
      finalize(() => {
        this.authState.isLoading.set(false);
      })
    );
  }

  /**
  * 🆕 LOGIN mejorado con mejor manejo de errores
  */
  login(credentials: LoginCredentials): Observable<UserData> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    console.log('🔐 Iniciando proceso de login...');

    return this.firebaseAuth.loginWithEmail(credentials).pipe(
      switchMap((result) => {
        console.log('✅ Login Firebase exitoso:', result.user.uid);

        if (!result.user.emailVerified) {
          console.warn('⚠️ Email no verificado');
          throw new Error('Por favor verifica tu correo electrónico antes de continuar');
        }

        // Obtener token de Firebase
        return from(result.user.getIdToken()).pipe(
          switchMap((idToken) => {
            console.log('🔑 Token Firebase obtenido');
            // Verificar token en backend
            return this.verificarTokenEnBackend(idToken);
          })
        );
      }),
      switchMap((authResponse) => {
        console.log('✅ Backend verification exitosa. Esperando sincronización de Firebase...');

        // CORRECCIÓN CLAVE: Usar la función 'user(this.auth)' para obtener el Observable del estado
        return user(this.auth).pipe(
          filter((user): user is User => user !== null), // Filtra hasta que user NO sea null
          take(1), // Toma el primer valor válido y completa
          switchMap((firebaseUser) => {
            console.log('✅ Firebase sincronizado. Obteniendo datos de Firestore...');
            // Ahora firebaseUser es definitivamente del tipo User
            return this.userDataService.getUserData(firebaseUser).pipe(
              map((firebaseUserData) => {
                const userData: UserData = {
                  ...firebaseUserData,
                  isAdmin: authResponse.isAdmin,
                };
                console.log('👤 Datos de usuario combinados:', userData);
                return userData;
              })
            );
          })
        );
      }),
      tap((userData) => {
        console.log('🎯 Redirigiendo usuario por rol...');
        this.redirectUserByRole(userData);
      }),
      catchError((error) => {
        console.error('❌ Error completo en login:', error);
        const errorMessage = error.message || 'Error al iniciar sesión';
        this.authState.authError.set(errorMessage);

        // Hacer logout de Firebase si falla el login
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
   * 🆕 LOGIN con Google refactorizado
   */
  loginWithGoogle(): Observable<UserData> {
    this.authState.isLoading.set(true);
    this.authState.clearAuthError();

    return this.firebaseAuth.loginWithGoogle().pipe(
      switchMap((result) => {
        // Obtener token de Firebase
        return from(result.user.getIdToken()).pipe(
          switchMap((idToken) => {
            // Verificar/sincronizar con backend
            return this.verificarTokenEnBackend(idToken);
          }),
          switchMap((authResponse) => {
            // CORRECCIÓN 3: Replicar el mismo patrón seguro para Google login
            return user(this.auth).pipe( // <--- CORRECCIÓN CLAVE
              filter((user): user is User => user !== null),
              take(1),
              switchMap((firebaseUser) => {
                // Obtener datos completos de Firestore
                return this.userDataService.getUserData(firebaseUser).pipe(
                  map((firebaseUserData) => {
                    const userData: UserData = {
                      ...firebaseUserData,
                      isAdmin: authResponse.isAdmin
                    };
                    return userData;
                  })
                );
              })
            );
          })
        );
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
   * 🆕 Verificar token en backend
   * POST /api/auth/verificar-token
   */
  private verificarTokenEnBackend(idToken: string): Observable<AuthResponse> {
    console.log('🔐 Verificando token en backend...');

    const headers = {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar-token`, {}, { headers }).pipe(
      tap((response) => {
        console.log('✅ Token verificado en backend:', response);
        // Guardar token
        localStorage.setItem('authToken', idToken);
        console.log('💾 Token guardado en localStorage');
      }),
      catchError((error) => {
        console.error('❌ Error verificando token en backend:', error);
        console.log('📊 Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        throw error;
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

  /**
   * Actualizar datos del usuario en Firestore
   */
  updateUserData(updates: Partial<UserData>): Observable<void> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    return this.userDataService.updateUserData(currentUser.uid, updates).pipe(
      tap(() => {
        this.authState.refreshCurrentUser().subscribe();
      })
    );
  }

  // Métodos delegados
  updateProfile(profileData: ProfileUpdateData): Observable<void> {
    return this.profileService.updateProfile(profileData).pipe(
      tap(() => {
        this.authState.refreshCurrentUser().subscribe();
      })
    );
  }

  uploadProfileImage(base64Image: string): Observable<string> {
    return this.profileService.uploadProfileImage(base64Image);
  }

  removeProfileImage(): Observable<void> {
    return this.profileService.removeProfileImage().pipe(
      tap(() => {
        this.authState.refreshCurrentUser().subscribe();
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.passwordService.changePassword(currentPassword, newPassword);
  }

  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    return this.passwordService.validatePasswordStrength(password);
  }

  getUserExtendedData(userId: string): Observable<any> {
    return this.profileService.getUserExtendedData(userId);
  }

  checkUserAdminStatus(uid: string): Observable<boolean> {
    return this.userDataService.checkIfUserIsAdmin(uid);
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

  // En tu AuthService, agrega este método:

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
}