// src/app/core/services/auth/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// Modelos
import {
  LoginCredentials, RegisterData,
  AuthResponse,
  UserData,
  MessageResponse
} from '@core/models/auth/auth.models';

// Servicios
import { AuthStateService } from './auth.state';
import { TokenService } from './token.service';

/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN JWT NATIVO (Sin Firebase)
 * ============================================================================
 * Maneja:
 * - Registro de usuarios
 * - Login con email/password
 * - Logout
 * - Refresh de tokens
 * - Gestión del estado de sesión
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
  private router = inject(Router);
  private authState = inject(AuthStateService);
  private tokenService = inject(TokenService);

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private redirectUrl: string | null = null;

  // ============================================================================
  // SUBJECTS PARA TOKENS
  // ============================================================================
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  // ============================================================================
  // PROPIEDADES PÚBLICAS
  // ============================================================================
  currentUser = this.authState.currentUser;
  isLoading = this.authState.isLoading;
  user$ = this.authState.user$;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  constructor() {
    this.initializeAuth();
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Inicializar autenticación desde localStorage
   */
  private initializeAuth(): void {
    const token = this.tokenService.getToken();

    if (token && !this.tokenService.isTokenExpired(token)) {
      console.log('🔄 Token válido encontrado, verificando sesión...');
      this.verificarToken(token).subscribe({
        next: () => console.log('✅ Sesión restaurada'),
        error: () => {
          console.warn('⚠️ Token inválido, limpiando sesión');
          this.tokenService.clearTokens();
          this.authState.clearAuthenticatedUser();
        }
      });
    } else {
      console.log('🔓 No hay sesión activa');
      this.authState.clearAuthenticatedUser();
    }
  }

  // ============================================================================
  // REGISTRO
  // ============================================================================

  /**
   * Registrar nuevo usuario
   */
  register(registerData: RegisterData): Observable<string> {
    this.authState.setLoading(true);
    this.authState.clearAuthError();

    // Validar que las contraseñas coincidan
    if (registerData.password !== registerData.confirmPassword) {
      this.authState.setLoading(false);
      return throwError(() => new Error('Las contraseñas no coinciden'));
    }

    const requestBody = {
      email: registerData.email,
      password: registerData.password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, requestBody).pipe(
      tap((response) => {
        console.log('✅ Registro exitoso:', response.email);

        // Guardar tokens
        this.tokenService.saveTokens(response.token, response.refreshToken);

        // Establecer usuario
        const userData = this.mapAuthResponseToUserData(response);
        this.authState.setAuthenticatedUser(userData);
        this.tokenSubject.next(response.token);
      }),
      map((response) => response.mensaje),
      catchError((error) => {
        const errorMessage = error.error?.mensaje || error.message || 'Error al registrar usuario';
        this.authState.setAuthError(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => this.authState.setLoading(false))
    );
  }

  // ============================================================================
  // LOGIN
  // ============================================================================

  /**
   * Login con email/password
   */
  login(credentials: LoginCredentials): Observable<UserData> {
    this.authState.setLoading(true);
    this.authState.clearAuthError();

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        console.log('✅ Login exitoso:', response.email);

        // Guardar tokens
        this.tokenService.saveTokens(response.token, response.refreshToken);

        // Establecer usuario
        const userData = this.mapAuthResponseToUserData(response);
        this.authState.setAuthenticatedUser(userData);
        this.tokenSubject.next(response.token);

        // Redirigir por rol
        this.redirectUserByRole(userData);
      }),
      map((response) => this.mapAuthResponseToUserData(response)),
      catchError((error) => {
        const errorMessage = this.handleAuthError(error);
        this.authState.setAuthError(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
      finalize(() => this.authState.setLoading(false))
    );
  }

  // ============================================================================
  // LOGOUT
  // ============================================================================

  /**
   * Cerrar sesión
   */
  logout(): Observable<void> {
    const user = this.authState.getCurrentUser();

    // Notificar al backend
    if (user) {
      this.http.post(`${this.apiUrl}/logout?email=${user.email}`, {})
        .subscribe({
          next: () => console.log('✅ Logout registrado en backend'),
          error: (err) => console.warn('⚠️ Error en logout backend:', err)
        });
    }

    // Limpiar estado local
    this.tokenService.clearTokens();
    this.authState.clearAuthenticatedUser();
    this.tokenSubject.next(null);

    // Navegar al home
    return new Observable(observer => {
      this.router.navigate(['/home']).then(() => {
        console.log('✅ Logout completado');
        observer.next();
        observer.complete();
      });
    });
  }

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================

  /**
   * Renovar access token usando refresh token
   */
  refreshToken(): Observable<string> {
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, refreshToken, {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      tap((response) => {
        console.log('✅ Token renovado');
        this.tokenService.saveToken(response.token);
        this.tokenSubject.next(response.token);
      }),
      map((response) => response.token),
      catchError((error) => {
        console.error('❌ Error renovando token:', error);
        this.logout();
        return throwError(() => new Error('Error renovando token'));
      })
    );
  }

  // ============================================================================
  // VERIFICACIÓN DE TOKEN
  // ============================================================================

  /**
   * Verificar si un token es válido
   */
  verificarToken(token: string): Observable<UserData> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar-token`, null, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap((response) => {
        const userData = this.mapAuthResponseToUserData(response);
        this.authState.setAuthenticatedUser(userData);
        this.tokenSubject.next(token);
      }),
      map((response) => this.mapAuthResponseToUserData(response)),
      catchError((error) => {
        console.error('❌ Token inválido:', error);
        this.tokenService.clearTokens();
        this.authState.clearAuthenticatedUser();
        return throwError(() => new Error('Token inválido'));
      })
    );
  }

  // ============================================================================
  // MÉTODOS REACTIVOS
  // ============================================================================

  /**
   * Observable de autenticación
   */
  isAuthenticated$(): Observable<boolean> {
    return this.user$.pipe(map(user => user !== null));
  }

  /**
   * Observable de usuario actual
   */
  getCurrentUser$(): Observable<UserData | null> {
    return this.user$;
  }

  /**
   * Observable del token actual
   */
  getIdToken$(): Observable<string | null> {
    const token = this.tokenService.getToken();
    return of(token);
  }

  // ============================================================================
  // GESTIÓN DE REDIRECCIONES
  // ============================================================================

  /**
   * Establecer URL de redirección
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

  // ============================================================================
  // MÉTODOS SÍNCRONOS
  // ============================================================================

  /**
   * Verificar si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.authState.isAdmin();
  }

  /**
   * Verificar disponibilidad de email
   */
  verificarEmailDisponible(email: string): Observable<boolean> {
    return this.http.get<MessageResponse>(`${this.apiUrl}/verificar-email/${email}`).pipe(
      map(response => response.success),
      catchError(() => of(false))
    );
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Mapear AuthResponse a UserData
   */
  private mapAuthResponseToUserData(response: AuthResponse): UserData {
    return {
      idUsuario: response.idUsuario,
      email: response.email,
      rol: response.rol,
      isAdmin: response.isAdmin,
      activo: response.activo,
      fechaCreacion: new Date(response.fechaCreacion),
      ultimoAcceso: response.ultimoAcceso ? new Date(response.ultimoAcceso) : undefined
    };
  }

  /**
   * Manejar errores de autenticación
   */
  private handleAuthError(error: any): string {
    if (error.status === 401) {
      return 'Credenciales inválidas';
    } else if (error.status === 403) {
      return 'Usuario inactivo. Contacte al administrador.';
    } else if (error.error?.mensaje) {
      return error.error.mensaje;
    }
    return 'Error al iniciar sesión. Intente nuevamente.';
  }
}