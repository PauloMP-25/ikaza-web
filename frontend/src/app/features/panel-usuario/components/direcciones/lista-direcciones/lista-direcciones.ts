// lista-direcciones.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Direccion } from '@core/models/direcciones/direccion.model';

@Component({
  selector: 'app-lista-direcciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-direcciones.html',
  styleUrl: './lista-direcciones.scss'
})

export class ListaDirecciones {
  @Input() direcciones: Direccion[] = [];
  @Input() isLoading: boolean = false;
  
  @Output() onEditar = new EventEmitter<number>();
  @Output() onEliminar = new EventEmitter<number>();
  @Output() onEstablecerPrincipal = new EventEmitter<number>();

  obtenerDireccionCompleta(direccion: Direccion): string {
    const partes = [
      direccion.direccion,
      direccion.distrito,
      direccion.provincia,
      direccion.region,
      direccion.pais
    ].filter(parte => parte);

    return partes.join(', ');
  }
}