// src/app/features/checkout/pago-pendiente/pago-pendiente.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-pago-pendiente',
  standalone: true,
  imports: [CommonModule],
  // ⚠️ Usar un template que refleje el pago pendiente (como el que me enviaste antes)
  templateUrl: './pago-pendiente.html',
  styleUrl: './pago-pendiente.scss'
})
export class PagoPendienteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pedidoId: number | null = null;
  numeroPedido: string = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.pedidoId = params['pedidoId'] ? parseInt(params['pedidoId']) : null;
      this.numeroPedido = params['numeroPedido'] || '';
    });
  }

  irAMisPedidos(): void {
    this.router.navigate(['/panel-usuario/historial-compras']);
  }

  irAlCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }
}