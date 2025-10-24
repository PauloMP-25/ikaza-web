import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
    selector: '[appCardValidation]',
    standalone: true
})
export class CardValidationService{
    @Input() cardType: 'visa' | 'mastercard' | 'amex' | 'auto' = 'auto';

    constructor(private el: ElementRef) { }

    @HostListener('input', ['$event'])
    onInput(event: any): void {
        let value = event.target.value.replace(/\D/g, '');

        // Auto-detectar tipo si está en modo auto
        if (this.cardType === 'auto') {
            this.cardType = this.detectCardType(value);
        }

        // Aplicar formato según el tipo
        const formatted = this.formatCardNumber(value);

        // Actualizar el valor del input
        event.target.value = formatted;

        // Disparar evento de cambio para reactive forms
        const inputEvent = new Event('input', { bubbles: true });
        event.target.dispatchEvent(inputEvent);
    }

    private detectCardType(number: string): 'visa' | 'mastercard' | 'amex' {
        if (number.startsWith('4')) return 'visa';
        if (number.startsWith('5') || (number.length >= 4 &&
            parseInt(number.substring(0, 4)) >= 2221 &&
            parseInt(number.substring(0, 4)) <= 2720)) {
            return 'mastercard';
        }
        if (number.startsWith('34') || number.startsWith('37')) return 'amex';
        return 'visa'; // default
    }

    private formatCardNumber(value: string): string {
        if (!value) return '';

        // Limitar longitud
        const maxLength = this.cardType === 'amex' ? 15 : 16;
        if (value.length > maxLength) {
            value = value.substring(0, maxLength);
        }

        // Formatear
        if (this.cardType === 'amex') {
            return value.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
        } else {
            return value.replace(/(\d{4})/g, '$1 ').trim();
        }
    }
}

// === DIRECTIVA PARA FECHA DE EXPIRACIÓN ===
@Directive({
    selector: '[appExpiryFormat]',
    standalone: true
})
export class ExpiryFormatDirective {
    @HostListener('input', ['$event'])
    onInput(event: any): void {
        let value = event.target.value.replace(/\D/g, '');

        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }

        event.target.value = value;

        const inputEvent = new Event('input', { bubbles: true });
        event.target.dispatchEvent(inputEvent);
    }
}

// === DIRECTIVA PARA CVV ===
@Directive({
    selector: '[appCvvFormat]',
    standalone: true
})
export class CvvFormatDirective {
    @Input() cardType: 'visa' | 'mastercard' | 'amex' = 'visa';

    @HostListener('input', ['$event'])
    onInput(event: any): void {
        let value = event.target.value.replace(/\D/g, '');
        const maxLength = this.cardType === 'amex' ? 4 : 3;

        if (value.length > maxLength) {
            value = value.substring(0, maxLength);
        }

        event.target.value = value;

        const inputEvent = new Event('input', { bubbles: true });
        event.target.dispatchEvent(inputEvent);
    }
}