// lista-tarjetas.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tarjeta } from '@core/models/tarjeta/tarjeta.model';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { TarjetasUtilsService } from '@core/services/tarjetas/tarjetas-utils.service.ts';
import { FormatoUltimosDigitos } from '@shared/pipes/formatoUltimosDigitos.pipe';

@Component({
  selector: 'app-lista-tarjetas',
  standalone: true,
  imports: [CommonModule, FormatoUltimosDigitos],
  templateUrl: './lista-tarjetas.html',
  styleUrl: './lista-tarjetas.scss'
})

export class ListaTarjetas {
  @Input() tarjetas: Tarjeta[] = [];
  @Input() isLoading: boolean = false;

  @Output() onEliminar = new EventEmitter<number>();
  @Output() onEstablecerPrincipal = new EventEmitter<number>();

  constructor(
    public tarjetaService: TarjetaService,
    public tarjetasUtilsService: TarjetasUtilsService
  ) { }


  formatearTipo(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'TARJETA_CREDITO': 'Crédito',
      'TARJETA_DEBITO': 'Débito',
      'MERCADO_PAGO': 'Mercado Pago',
      'CULQI': 'Culqi',
      'TRANSFERENCIA_BANCARIA': 'Transferencia',
      'EFECTIVO': 'Efectivo'
    };
    return tipos[tipo] || tipo;
  }

  /**
  * Helper para obtener las clases CSS combinadas: Banco y Marca (VISA/MC)
  */
  getCardClasses(tarjeta: Tarjeta): string {
    const bankClass = this.tarjetasUtilsService.getBankClass(tarjeta.bancoEmisor || '');
    const brandClass = this.tarjetasUtilsService.getBrandClass(tarjeta.tipoTarjeta || '');
    // Retornamos ambas clases separadas por espacio
    return `${bankClass} ${brandClass}`;
  }

  /**
     * Transforma la cadena del tipo de tarjeta para su visualización (ej: 'TARJETA_CREDITO' -> 'Tarjeta Crédito')
     * @param tipo El string de tipo que viene de la API.
     * @returns El string formateado.
     */
  formatearTipoParaDisplay(tipo: string | undefined): string {
    if (!tipo) return 'N/A';
    // 1. Reemplaza guiones bajos por espacios
    let resultado = tipo.replace(/_/g, ' ');
    // 2. Opcional: Capitaliza la primera letra de cada palabra para un mejor display
    resultado = resultado.toLowerCase().split(' ').map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    return resultado;
  }
}