// src/app/core/services/verification/verification.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * ============================================================================
 * MODELOS DE VERIFICACIÓN
 * ============================================================================
 */
export interface VerificationResponse {
    mensaje: string;
    success: boolean;
    codigoEnviado?: boolean;
}

/**
 * ============================================================================
 * SERVICIO DE VERIFICACIÓN (Email y Teléfono)
 * ============================================================================
 * Usa servicios del backend para enviar códigos por email/SMS
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})
export class VerificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/verification`;

    // ============================================================================
    // VERIFICACIÓN DE EMAIL
    // ============================================================================

    /**
     * Enviar código de verificación por email
     */
    sendEmailVerificationCode(email: string): Observable<VerificationResponse> {
        return this.http.post<VerificationResponse>(`${this.apiUrl}/email/send`, { email }).pipe(
            tap(response => {
                console.log('✅ Código de verificación enviado al email:', email);
            }),
            catchError(error => {
                console.error('❌ Error enviando código de verificación:', error);

                let errorMessage = 'Error al enviar código de verificación';

                if (error.status === 429) {
                    errorMessage = 'Has solicitado muchos códigos. Intenta más tarde.';
                } else if (error.error?.mensaje) {
                    errorMessage = error.error.mensaje;
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * Verificar código de email
     */
    verifyEmailCode(email: string, code: string): Observable<VerificationResponse> {
        return this.http.post<VerificationResponse>(`${this.apiUrl}/email/verify`, {
            email,
            code
        }).pipe(
            tap(() => console.log('✅ Email verificado exitosamente')),
            catchError(error => {
                console.error('❌ Error verificando código de email:', error);

                let errorMessage = 'Código inválido o expirado';

                if (error.status === 400) {
                    errorMessage = 'Código incorrecto';
                } else if (error.status === 410) {
                    errorMessage = 'Código expirado. Solicita uno nuevo.';
                } else if (error.error?.mensaje) {
                    errorMessage = error.error.mensaje;
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    // ============================================================================
    // VERIFICACIÓN DE TELÉFONO
    // ============================================================================

    /**
     * Enviar código de verificación por SMS
     */
    sendPhoneVerificationCode(telefono: string): Observable<VerificationResponse> {
        return this.http.post<VerificationResponse>(`${this.apiUrl}/phone/send`, { telefono }).pipe(
            tap(response => {
                console.log('✅ Código SMS enviado al teléfono:', telefono);
            }),
            catchError(error => {
                console.error('❌ Error enviando código SMS:', error);

                let errorMessage = 'Error al enviar código SMS';

                if (error.status === 429) {
                    errorMessage = 'Has solicitado muchos códigos. Intenta más tarde.';
                } else if (error.status === 400) {
                    errorMessage = 'Número de teléfono inválido';
                } else if (error.error?.mensaje) {
                    errorMessage = error.error.mensaje;
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * Verificar código de teléfono
     */
    verifyPhoneCode(email: string, telefono: string, code: string): Observable<VerificationResponse> {
        return this.http.post<VerificationResponse>(`${this.apiUrl}/phone/verify`, {
            email,
            telefono,
            code
        }).pipe(
            tap(() => console.log('✅ Teléfono verificado exitosamente')),
            // Después de verificar, actualizar el estado en el backend
            switchMap(response => {
                return this.http.put<VerificationResponse>(
                    `${environment.apiUrl}/api/clientes/perfil/${email}/verificar-telefono`,
                    {}
                ).pipe(
                    switchMap(() => this.http.get<VerificationResponse>(`${this.apiUrl}/phone/verify`))
                );
            }),
            catchError(error => {
                console.error('❌ Error verificando código SMS:', error);

                let errorMessage = 'Código inválido o expirado';

                if (error.status === 400) {
                    errorMessage = 'Código incorrecto';
                } else if (error.status === 410) {
                    errorMessage = 'Código expirado. Solicita uno nuevo.';
                } else if (error.error?.mensaje) {
                    errorMessage = error.error.mensaje;
                }

                return throwError(() => new Error(errorMessage));
            })
        );
    }

    // ============================================================================
    // ESTADO DE VERIFICACIÓN
    // ============================================================================

    /**
     * Verificar estado de email
     */
    checkEmailVerificationStatus(email: string): Observable<{ verified: boolean }> {
        return this.http.get<{ verified: boolean }>(`${this.apiUrl}/email/status/${email}`).pipe(
            tap(response => console.log('Estado de email:', response.verified ? 'Verificado' : 'No verificado'))
        );
    }

    /**
     * Verificar estado de teléfono
     */
    checkPhoneVerificationStatus(email: string): Observable<{ verified: boolean }> {
        return this.http.get<{ verified: boolean }>(`${this.apiUrl}/phone/status/${email}`).pipe(
            tap(response => console.log('Estado de teléfono:', response.verified ? 'Verificado' : 'No verificado'))
        );
    }
}