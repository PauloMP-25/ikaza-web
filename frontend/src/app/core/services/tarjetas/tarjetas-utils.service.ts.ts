import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TarjetasUtilsService {

  /**
   * Mapea el nombre completo del banco emisor a una clase CSS estandarizada.
   * Esta clase se usará para aplicar estilos (colores, fondos) específicos de la tarjeta.
   * @param bancoEmisor Nombre del banco tal como viene de la API (ej. 'BANCO DE CREDITO DEL PERU').
   * @returns Clase CSS para estilizar la tarjeta (ej. 'bcp', 'interbank', 'banco-nacion').
   */
  getBankClass(bancoEmisor: string): string {
    if (!bancoEmisor) return 'default'; // Clase por defecto

    const normalizado = bancoEmisor.toLowerCase().trim();

    // Mapeo de Bancos Peruanos comunes
    if (normalizado.includes('credito del peru') || normalizado.includes('bcp')) {
      return 'bcp';
    } else if (normalizado.includes('internacional del peru') || normalizado.includes('interbank')) {
      return 'interbank';
    } else if (normalizado.includes('banco de la nacion')) {
      return 'banco-nacion';
    } else if (normalizado.includes('scotiabank')) {
      return 'scotiabank';
    } else if (normalizado.includes('bbva')) {
      return 'bbva';
    }

    // El tipo de tarjeta (VISA/Mastercard) ya está siendo manejado por 'tipoTarjeta' en tu HTML,
    // pero puedes agregar un fallback si el banco no se reconoce
    return 'default';
  }

  /**
   * Mapea el tipo de tarjeta (VISA, MASTERCARD) a su clase CSS estandarizada.
   * Es similar a getBankClass pero se basa en el campo 'tipoTarjeta'.
   * @param tipoTarjeta Nombre de la marca (ej. 'VISA', 'MASTERCARD').
   * @returns Clase CSS estandarizada (ej. 'visa', 'mastercard').
   */
  getBrandClass(tipoTarjeta: string): string {
    if (!tipoTarjeta) return 'generic';
    // Tu lógica existente en el componente es buena para esto, la centralizamos aquí
    return tipoTarjeta.toLowerCase().replace(/\s+/g, '-');
  }

  /**
     * Mapea el nombre del banco emisor a un nombre corto para mostrar en la UI.
     * @param bancoEmisor Nombre del banco tal como viene de la API.
     * @returns Nombre corto del banco (ej. 'BCP', 'Interbank').
     */
  getBankShortName(bancoEmisor: string): string {
    if (!bancoEmisor) return 'BANCO';
    const normalizado = bancoEmisor.toLowerCase().trim();
    if (normalizado.includes('credito del peru') || normalizado.includes('bcp')) {
      return 'BCP';
    } else if (normalizado.includes('internacional del peru') || normalizado.includes('interbank')) {
      return 'Interbank';
    } else if (normalizado.includes('banco de la nacion')) {
      return 'Banco Nación';
    } else if (normalizado.includes('scotiabank')) {
      return 'Scotiabank';
    } else if (normalizado.includes('bbva')) {
      return 'BBVA';
    }

    return 'Banco Genérico';
  }
}