// formulario-tarjeta.component.ts
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tarjeta, CardInfo, TarjetaFormData } from '@core/models/tarjeta/tarjeta.model';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { NotificacionService } from '@core/services/notificaciones/servicio-notificacion';

@Component({
  selector: 'app-formulario-tarjeta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario-tarjeta.html',
  styleUrl: './formulario-tarjeta.scss'
})
export class FormularioTarjeta implements OnInit {
  @Output() onGuardar = new EventEmitter<Tarjeta>();
  @Output() onCancelar = new EventEmitter<void>();

  cardForm: FormGroup;
  selectedCardType: 'visa' | 'mastercard' | 'amex' = 'visa';
  isCardFlipped = false;
  isValidating = false;
  cardInfo: CardInfo | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private tarjetaService: TarjetaService,
    private notificacionService: NotificacionService
  ) {
    this.cardForm = this.fb.group({
      numero: ['', [Validators.required, Validators.minLength(13), Validators.maxLength(19)]],
      titular: ['', [Validators.required, Validators.minLength(2)]],
      expiracion: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
      alias: [''],
      esPrincipal: [false]
    });
  }

  ngOnInit(): void {
    // Detectar tipo de tarjeta automáticamente
    this.cardForm.get('numero')?.valueChanges.subscribe(value => {
      if (value && value.length >= 1) {
        const detected = this.tarjetaService.detectarTipoTarjeta(value);
        if (detected !== 'unknown') {
          this.selectCardType(detected as 'visa' | 'mastercard' | 'amex');
        }
      }
    });
  }

  selectCardType(type: 'visa' | 'mastercard' | 'amex'): void {
    this.selectedCardType = type;

    // Actualizar validación CVV según el tipo de tarjeta
    const cvvControl = this.cardForm.get('cvv');
    if (type === 'amex') {
      cvvControl?.setValidators([Validators.required, Validators.pattern(/^\d{4}$/)]);
    } else {
      cvvControl?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
    }
    cvvControl?.updateValueAndValidity();
  }

  getBrandName(type: string): string {
    const brands = {
      'visa': 'VISA',
      'mastercard': 'MasterCard',
      'amex': 'AMERICAN EXPRESS'
    };
    return brands[type as keyof typeof brands] || 'VISA';
  }

  formatCardNumber(value: string): string {
    if (!value) return '•••• •••• •••• ••••';

    const numbers = value.replace(/\D/g, '');
    let formatted = '';

    if (this.selectedCardType === 'amex') {
      formatted = numbers.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      formatted = numbers.replace(/(\d{4})/g, '$1 ').trim();
    }

    const maxLength = this.selectedCardType === 'amex' ? 15 : 16;
    const remainingDigits = maxLength - numbers.length;

    if (remainingDigits > 0) {
      const dots = '•'.repeat(remainingDigits);
      if (formatted.length > 0) {
        formatted += ' ' + dots.match(/.{1,4}/g)?.join(' ');
      } else {
        formatted = '•••• •••• •••• ••••';
      }
    }

    return formatted;
  }

  formatCardNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');

    const maxLength = this.selectedCardType === 'amex' ? 15 : 16;
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }

    let formatted = '';
    if (this.selectedCardType === 'amex') {
      formatted = value.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    }

    event.target.value = formatted;
    this.cardForm.get('numero')?.setValue(value, { emitEvent: false });
  }

  formatExpiry(value: string): string {
    if (!value) return 'MM/YY';
    if (value.includes('/')) return value;
    if (value.length >= 2) {
      return value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    return value + 'M/YY'.substring(value.length);
  }

  formatExpiryInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }

    event.target.value = value;
    this.cardForm.get('expiracion')?.setValue(value, { emitEvent: false });
  }

  async validarYGuardarTarjeta(): Promise<void> {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.notificacionService.showToast('Por favor completa todos los campos correctamente.', 'error');
      return;
    }

    const numeroLimpio = this.cardForm.get('numero')?.value.replace(/\D/g, '');

    // Validar con algoritmo de Luhn
    if (!this.tarjetaService.validarNumeroTarjeta(numeroLimpio)) {
      this.notificacionService.showToast('El número de tarjeta no es válido.', 'error');
      return;
    }

    // Validar fecha de expiración
    const expiracion = this.cardForm.get('expiracion')?.value;
    if (!this.tarjetaService.validarFechaExpiracion(expiracion)) {
      this.notificacionService.showToast('La fecha de expiración no es válida o la tarjeta está vencida.', 'error');
      return;
    }

    this.isValidating = true;
    const primeros6Digitos = numeroLimpio.substring(0, 6);

    try {
      // Verificar con API IIN
      const info = await this.tarjetaService.verificarTarjeta(primeros6Digitos).toPromise();

      if (!info) {
        this.notificacionService.showToast('No se pudo verificar la tarjeta. Intenta nuevamente.', 'error');
        this.isValidating = false;
        return;
      }

      this.cardInfo = info;

      // Construir objeto Tarjeta para enviar al backend
      const tarjeta: Tarjeta = {
        tipo: this.tarjetaService.mapearTipoTarjeta(info.cardType),
        tokenPago: this.generarTokenTemporal(numeroLimpio),
        ultimos4Digitos: numeroLimpio.substring(numeroLimpio.length - 4),
        nombreTitular: this.cardForm.get('titular')?.value,
        bancoEmisor: info.issuingInstitution,
        tipoTarjeta: info.cardBrand, // VISA, MASTERCARD, AMEX
        fechaExpiracion: expiracion,
        alias: this.cardForm.get('alias')?.value || null,
        esPrincipal: this.cardForm.get('esPrincipal')?.value || false,
        fechaCreacion: new Date().toISOString() || null
      };

      console.log('📤 Tarjeta a guardar:', tarjeta);
      this.onGuardar.emit(tarjeta);

    } catch (error) {
      console.error('Error al validar tarjeta:', error);
      this.notificacionService.showToast('Error al validar la tarjeta', 'error');
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * TEMPORAL: Genera un token simulado
   * TODO: Reemplazar con integración real de pasarela de pago (Culqi, MercadoPago, etc.)
   */
  private generarTokenTemporal(numeroCompleto: string): string {
    // En producción, este token vendría de la pasarela de pago
    // Ejemplo: await culqi.createToken(cardData)
    const timestamp = Date.now();
    const hash = btoa(`${numeroCompleto}-${timestamp}`);
    return `TEMP_TOKEN_${hash.substring(0, 50)}`;
  }

  cancelar(): void {
    this.resetForm();
    this.onCancelar.emit();
  }

  resetForm(): void {
    this.cardForm.reset({
      esPrincipal: false
    });
    this.selectedCardType = 'visa';
    this.isCardFlipped = false;
    this.cardInfo = null;
  }
}