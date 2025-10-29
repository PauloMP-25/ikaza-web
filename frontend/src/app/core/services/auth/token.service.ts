// src/app/core/services/auth/token.service.ts
import { Injectable } from '@angular/core';
import { DecodedToken } from '@core/models/auth/auth.models';

/**
 * ============================================================================
 * SERVICIO DE GESTIÓN DE TOKENS JWT
 * ============================================================================
 * Maneja:
 * - Almacenamiento de tokens en localStorage
 * - Decodificación de JWT
 * - Verificación de expiración
 * - Obtención de claims
 * ============================================================================
 */
@Injectable({
    providedIn: 'root'
})
export class TokenService {
    // ============================================================================
    // CONSTANTES
    // ============================================================================
    private readonly TOKEN_KEY = 'access_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';

    // ============================================================================
    // ALMACENAMIENTO DE TOKENS
    // ============================================================================

    /**
     * Guardar access token
     */
    saveToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    /**
     * Guardar refresh token
     */
    saveRefreshToken(refreshToken: string): void {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }

    /**
     * Guardar ambos tokens
     */
    saveTokens(accessToken: string, refreshToken: string): void {
        this.saveToken(accessToken);
        this.saveRefreshToken(refreshToken);
    }

    /**
     * Obtener access token
     */
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Obtener refresh token
     */
    getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    /**
     * Limpiar todos los tokens
     */
    clearTokens(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }

    // ============================================================================
    // DECODIFICACIÓN DE JWT
    // ============================================================================

    /**
     * Decodificar token JWT
     * @returns Token decodificado o null si es inválido
     */
    decodeToken(token: string): DecodedToken | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            const payload = parts[1];
            const decoded = JSON.parse(atob(payload));

            return {
                sub: decoded.sub,
                iat: decoded.iat,
                exp: decoded.exp,
                rol: decoded.rol
            };
        } catch (error) {
            console.error('Error decodificando token:', error);
            return null;
        }
    }

    // ============================================================================
    // VERIFICACIÓN DE EXPIRACIÓN
    // ============================================================================

    /**
     * Verificar si un token está expirado
     */
    isTokenExpired(token: string): boolean {
        const decoded = this.decodeToken(token);

        if (!decoded || !decoded.exp) {
            return true;
        }

        const expirationDate = new Date(decoded.exp * 1000);
        const now = new Date();

        return expirationDate <= now;
    }

    /**
     * Obtener tiempo restante del token en minutos
     */
    getTokenRemainingTime(token: string): number {
        const decoded = this.decodeToken(token);

        if (!decoded || !decoded.exp) {
            return 0;
        }

        const expirationDate = new Date(decoded.exp * 1000);
        const now = new Date();

        const remainingMs = expirationDate.getTime() - now.getTime();
        return Math.max(0, Math.round(remainingMs / 1000 / 60));
    }

    // ============================================================================
    // OBTENCIÓN DE CLAIMS
    // ============================================================================

    /**
     * Obtener email del token
     */
    getEmailFromToken(token: string): string | null {
        const decoded = this.decodeToken(token);
        return decoded?.sub || null;
    }

    /**
     * Obtener rol del token
     */
    getRolFromToken(token: string): string | null {
        const decoded = this.decodeToken(token);
        return decoded?.rol || null;
    }

    // ============================================================================
    // VALIDACIÓN
    // ============================================================================

    /**
     * Validar si un token es válido (no expirado y bien formado)
     */
    isValidToken(token: string | null): boolean {
        if (!token) {
            return false;
        }

        try {
            const decoded = this.decodeToken(token);
            if (!decoded) {
                return false;
            }

            return !this.isTokenExpired(token);
        } catch {
            return false;
        }
    }
}