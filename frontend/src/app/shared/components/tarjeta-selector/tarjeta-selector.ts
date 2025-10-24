// src/app/shared/components/tarjeta-selector/tarjeta-selector.component.ts
import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TarjetaService } from '@core/services/tarjetas/tarjeta.service';
import { Tarjeta } from '@core/models/tarjeta/tarjeta.model';
import { FormatoUltimosDigitos } from '@shared/pipes/formatoUltimosDigitos.pipe';

@Component({
  selector: 'app-tarjeta-selector',
  standalone: true,
  imports: [CommonModule, FormatoUltimosDigitos],
  templateUrl: './tarjeta-selector.html',
  styleUrl: './tarjeta-selector.scss'
})
export class TarjetaSelectorComponent implements OnInit {
  public tarjetaService = inject(TarjetaService);
  tarjetas: Tarjeta[] = [];
  isLoading: boolean = true;
  
  tarjetaSeleccionada: Tarjeta | null = null;
  @Output() tarjetaSelected = new EventEmitter<Tarjeta | null>();

  ngOnInit(): void {
    this.cargarTarjetas();
  }

  cargarTarjetas(): void {
    this.tarjetaService.obtenerTarjetas().subscribe({
      next: (data) => {
        this.tarjetas = data;
        this.isLoading = false;
        // Seleccionar la principal por defecto
        const principal = data.find(t => t.esPrincipal && t.activo);
        if (principal) {
            this.seleccionarTarjeta(principal);
        }
      },
      error: (e) => {
        console.error('Error cargando tarjetas:', e);
        this.isLoading = false;
      }
    });
  }
  
  seleccionarTarjeta(tarjeta: Tarjeta): void {
      this.tarjetaSeleccionada = tarjeta;
      this.tarjetaSelected.emit(tarjeta);
  }
}