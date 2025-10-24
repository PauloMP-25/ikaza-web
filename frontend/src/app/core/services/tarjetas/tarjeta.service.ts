// tarjeta.service.ts (REFACTORIZADO)
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Tarjeta, CardInfo } from '@core/models/tarjeta/tarjeta.model';

// Interfaz para la respuesta de la API IIN
interface IINApiResponse {
  valid: boolean;
  result?: {
    Bin: string;
    CardBrand: string;
    IssuingInstitution: string;
    CardType: string;
    CardCategory: string;
    IssuingCountry: string;
    IssuingCountryCode: string;
  };
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TarjetaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/usuarios/pagos`;
  private iinApiKey = environment.tarjetaApiKey;
  private iinApiUrl = 'https://api.iinapi.com/iin';

  // ============= MÉTODOS BACKEND =============

  /**
   * GET /api/usuarios/pagos
   * Obtiene todas las tarjetas activas del usuario autenticado
   */
  obtenerTarjetas(): Observable<Tarjeta[]> {
    return this.http.get<Tarjeta[]>(this.apiUrl);
  }

  /**
   * POST /api/usuarios/pagos
   * Guarda una nueva tarjeta
   */
  guardarTarjeta(tarjeta: Tarjeta): Observable<Tarjeta> {
    return this.http.post<Tarjeta>(this.apiUrl, tarjeta);
  }

  /**
   * DELETE /api/usuarios/pagos/{idMetodo}
   * Elimina (desactiva) una tarjeta
   */
  eliminarTarjeta(idMetodo: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idMetodo}`);
  }

  /**
  * PUT /api/usuarios/pagos/{idMetodo}/principal
  * Marca una tarjeta como principal.
  */
  actualizarTarjetaPrincipal(idMetodo: number, tarjeta: Tarjeta): Observable<Tarjeta> {
    return this.http.put<Tarjeta>(`${this.apiUrl}/${idMetodo}/principal`, tarjeta);
  }


  // ============= VALIDACIÓN CON API IIN =============

  /**
   * Verifica una tarjeta usando los primeros 6 dígitos (BIN) con la API IIN
   */
  verificarTarjeta(digits: string): Observable<CardInfo | null> {
    if (!this.iinApiKey) {
      console.error('API Key para verificación de tarjetas no configurada');
      return of(null);
    }

    const url = `${this.iinApiUrl}?key=${this.iinApiKey}&digits=${digits}`;

    return this.http.get<IINApiResponse>(url).pipe(
      map(response => {
        if (response.valid && response.result) {
          const info = response.result;
          return {
            bin: info.Bin || 'N/A',
            cardBrand: info.CardBrand || 'N/A',              // → tipoTarjeta
            issuingInstitution: info.IssuingInstitution || 'N/A', // → bancoEmisor
            cardType: info.CardType || 'N/A',                // → tipo (CREDITO/DEBITO)
            cardCategory: info.CardCategory || 'N/A',
            issuingCountry: info.IssuingCountry || 'N/A',
            issuingCountryCode: info.IssuingCountryCode || 'N/A'
          };
        }
        return null;
      }),
      catchError(error => {
        console.error('Error en la API de validación de tarjeta:', error);
        return of(null);
      })
    );
  }

  // ============= UTILIDADES DE VALIDACIÓN =============

  /**
   * Detecta automáticamente el tipo de tarjeta basado en el BIN
   */
  detectarTipoTarjeta(numero: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
    const numeroLimpio = numero.replace(/\D/g, '');

    if (numeroLimpio.startsWith('4')) return 'visa';

    if (numeroLimpio.startsWith('5') ||
      (numeroLimpio.length >= 4 &&
        parseInt(numeroLimpio.substring(0, 4)) >= 2221 &&
        parseInt(numeroLimpio.substring(0, 4)) <= 2720)) {
      return 'mastercard';
    }

    if (numeroLimpio.startsWith('34') || numeroLimpio.startsWith('37')) return 'amex';

    return 'unknown';
  }

  /**
   * Valida el formato del número de tarjeta usando algoritmo de Luhn
   */
  validarNumeroTarjeta(numero: string): boolean {
    const numeroLimpio = numero.replace(/\D/g, '');

    if (numeroLimpio.length < 13 || numeroLimpio.length > 19) {
      return false;
    }

    return this.algoritmoDeLuhn(numeroLimpio);
  }

  /**
   * Algoritmo de Luhn para validar números de tarjeta
   */
  private algoritmoDeLuhn(numero: string): boolean {
    let suma = 0;
    let alternar = false;

    for (let i = numero.length - 1; i >= 0; i--) {
      let digito = parseInt(numero.charAt(i), 10);

      if (alternar) {
        digito *= 2;
        if (digito > 9) {
          digito = (digito % 10) + 1;
        }
      }

      suma += digito;
      alternar = !alternar;
    }

    return (suma % 10) === 0;
  }

  /**
   * Valida fecha de expiración MM/YY
   */
  validarFechaExpiracion(fecha: string): boolean {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(fecha)) {
      return false;
    }

    const [mes, año] = fecha.split('/');
    const fechaExpiracion = new Date(2000 + parseInt(año), parseInt(mes) - 1);
    const hoy = new Date();

    return fechaExpiracion > hoy;
  }

  /**
   * Obtiene la clase de icono CSS para la marca de tarjeta
   */
  obtenerClaseIcono(marca: string): string {
    const marcaLower = marca.toLowerCase();

    if (marcaLower.includes('visa')) return 'fa-cc-visa';
    if (marcaLower.includes('mastercard') || marcaLower.includes('master card')) return 'fa-cc-mastercard';
    if (marcaLower.includes('american express') || marcaLower.includes('amex')) return 'fa-cc-amex';
    if (marcaLower.includes('discover')) return 'fa-cc-discover';
    if (marcaLower.includes('diners')) return 'fa-cc-diners-club';

    return 'fa-credit-card';
  }

  /**
   * Mapea CardInfo (de API IIN) a tipo de base de datos
   * Credit → TARJETA_CREDITO
   * Debit → TARJETA_DEBITO
   */
  mapearTipoTarjeta(cardType: string): string {
    const tipo = cardType.toLowerCase();
    if (tipo.includes('credit')) return 'TARJETA_CREDITO';
    if (tipo.includes('debit')) return 'TARJETA_DEBITO';
    return 'TARJETA_CREDITO'; // Default
  }
}