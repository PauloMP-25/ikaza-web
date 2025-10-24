// src/app/features/checkout/pago-error/pago-error.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-pago-error',
  standalone: true,
  imports: [CommonModule],
  // ⚠️ Usar un template que refleje el error (como el que me enviaste antes)
  templateUrl: './pago-error.html',
  styleUrl: './pago-error.scss'
})
export class PagoErrorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  pedidoId: number | null = null;
  motivoRechazo: string = 'El pago fue rechazado por el procesador de pagos.';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.pedidoId = params['pedidoId'] ? parseInt(params['pedidoId']) : null;
      const status = params['status'];
      const motivo = params['motivo'];

      if (motivo) {
          this.motivoRechazo = motivo;
      } else if (status === 'rejected') {
        this.motivoRechazo = 'Tu pago fue rechazado por el banco emisor.';
      } else if (status === 'cancelled') {
        this.motivoRechazo = 'El pago fue cancelado.';
      }
    });
  }

  intentarNuevamente(): void {
    // Volver al carrito o checkout para reintentar el pago
    this.router.navigate(['/carrito']);
  }

  irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }
}