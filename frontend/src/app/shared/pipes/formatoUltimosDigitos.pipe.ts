// src/app/shared/pipes/formato-tarjeta.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
/**
 * Transforma los últimos 4 dígitos de una tarjeta al formato ofuscado para mostrar.
 * Ej: '1234' -> '**** **** **** 1234'
 */
@Pipe({
    name: 'formatoUltimosDigitos',
    standalone: true
})
export class FormatoUltimosDigitos implements PipeTransform {

    transform(ultimos4: string | null | undefined): string {
        if (!ultimos4 || ultimos4.length !== 4) {
            return '**** **** **** ****';
        }
        // Formato estándar para visualización
        return `**** **** **** ${ultimos4}`;
    }
}