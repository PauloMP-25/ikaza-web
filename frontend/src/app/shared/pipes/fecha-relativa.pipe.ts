import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'fechaRelativa',
    standalone: true
})
export class FechaRelativaPipe implements PipeTransform {

    transform(fecha: Date | string): string {
        if (!fecha) return '';

        const ahora = new Date();
        const fechaCompra = new Date(fecha);
        const diferenciaMilisegundos = ahora.getTime() - fechaCompra.getTime();
        const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
        const diferenciaHoras = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60));
        const diferenciaMinutos = Math.floor(diferenciaMilisegundos / (1000 * 60));

        if (diferenciaMinutos < 1) return 'Ahora mismo';
        if (diferenciaMinutos < 60) return `Hace ${diferenciaMinutos} minuto${diferenciaMinutos !== 1 ? 's' : ''}`;
        if (diferenciaHoras < 24) return `Hace ${diferenciaHoras} hora${diferenciaHoras !== 1 ? 's' : ''}`;
        if (diferenciaDias === 0) return 'Hoy';
        if (diferenciaDias === 1) return 'Ayer';
        if (diferenciaDias < 7) return `Hace ${diferenciaDias} día${diferenciaDias !== 1 ? 's' : ''}`;
        if (diferenciaDias < 30) {
            const semanas = Math.floor(diferenciaDias / 7);
            return `Hace ${semanas} semana${semanas !== 1 ? 's' : ''}`;
        }
        if (diferenciaDias < 365) {
            const meses = Math.floor(diferenciaDias / 30);
            return `Hace ${meses} mes${meses !== 1 ? 'es' : ''}`;
        }

        const años = Math.floor(diferenciaDias / 365);
        return `Hace ${años} año${años !== 1 ? 's' : ''}`;
    }
}

// === PIPE PARA FORMATEAR MONEDA PERUANA ===
@Pipe({
    name: 'monedaPeruana',
    standalone: true
})
export class MonedaPeruanaPipe implements PipeTransform {

    transform(valor: number, mostrarSimboloSoles: boolean = false): string {
        if (valor === null || valor === undefined) return '';

        const simbolo = mostrarSimboloSoles ? 'S/ ' : '$ ';
        return simbolo + valor.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// === PIPE PARA ESTADO DE COMPRA ===
@Pipe({
    name: 'estadoCompra',
    standalone: true
})
export class EstadoCompraPipe implements PipeTransform {

    private traducciones: { [key: string]: string } = {
        'pending': 'Pendiente',
        'processing': 'Procesando',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado',
        'returned': 'Devuelto',
        'refunded': 'Reembolsado'
    };

    transform(estado: string): string {
        return this.traducciones[estado.toLowerCase()] || estado;
    }
}

// === PIPE PARA TRUNCAR TEXTO ===
@Pipe({
    name: 'truncar',
    standalone: true
})
export class TruncarPipe implements PipeTransform {

    transform(texto: string, limite: number = 50, sufijo: string = '...'): string {
        if (!texto) return '';
        if (texto.length <= limite) return texto;

        return texto.substring(0, limite).trim() + sufijo;
    }
}

// === PIPE PARA RESALTAR TEXTO BUSCADO ===
@Pipe({
    name: 'resaltar',
    standalone: true
})
export class ResaltarPipe implements PipeTransform {

    transform(texto: string, busqueda: string): string {
        if (!texto || !busqueda) return texto;

        const regex = new RegExp(`(${busqueda})`, 'gi');
        return texto.replace(regex, '<mark>$1</mark>');
    }
}