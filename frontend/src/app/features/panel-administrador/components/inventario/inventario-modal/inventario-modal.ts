import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { InventarioService } from '@core/services/inventario/inventario.service.ts';
import { ProductoInventario, MovimientoInventario, AjusteStockRequest } from '@core/models/inventario/inventario.model';

@Component({
    selector: 'app-inventario-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './inventario-modal.html',
    styleUrls: ['./inventario-modal.scss']
})
export class InventarioModal implements OnChanges {
    private inventarioService = inject(InventarioService);

    @Input() productoInventario!: ProductoInventario;
    @Output() stockActualizado = new EventEmitter<number>();

    historialMovimientos: MovimientoInventario[] = [];
    isSaving = false;
    errorMessage: string | null = null;

    ajuste: AjusteStockRequest = {
        tipo: 'ENTRADA',
        cantidad: 1,
        motivo: ''
    };

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['productoInventario'] && this.productoInventario) {
            this.ajuste = {
                tipo: 'ENTRADA',
                cantidad: 1,
                motivo: ''
            };
            this.errorMessage = null;
            this.cargarHistorial(this.productoInventario.idProducto);
        }
    }

    // Carga los movimientos de inventario para un producto específico
    /**
    * Carga el historial de movimientos desde el backend
    */
    cargarHistorial(idProducto: number) {
        this.inventarioService.obtenerMovimientosPorProducto(idProducto).subscribe({
            next: (movimientos: MovimientoInventario[]) => {
                this.historialMovimientos = movimientos.sort((a, b) =>
                    new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime()
                );
            },
            error: (err) => {
                console.error('Error al cargar historial:', err);
                this.historialMovimientos = [];
            }
        });
    }

    // Registra un nuevo movimiento (entrada o salida) y actualiza el stock del producto
    /**
     * Registra un ajuste de stock (entrada, salida o ajuste)
     * El backend maneja toda la lógica de actualización
     */
    registrarAjuste() {
        if (this.ajuste.cantidad <= 0) {
            this.errorMessage = 'La cantidad debe ser mayor a 0';
            return;
        }

        if (!this.ajuste.motivo.trim()) {
            this.errorMessage = 'Debe ingresar un motivo para el ajuste';
            return;
        }

        // Validación para salidas
        if (this.ajuste.tipo === 'SALIDA' && this.ajuste.cantidad > this.productoInventario.stock) {
            this.errorMessage = `No hay suficiente stock. Stock actual: ${this.productoInventario.stock}`;
            return;
        }

        this.isSaving = true;
        this.errorMessage = null;

        this.inventarioService.ajustarStock(this.productoInventario.idProducto, this.ajuste)
            .pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: (inventarioActualizado) => {
                    // Actualizar el stock local
                    this.productoInventario.stock = inventarioActualizado.stockActual;

                    // Emitir el nuevo stock al componente padre
                    this.stockActualizado.emit(inventarioActualizado.stockActual);

                    // Recargar historial
                    this.cargarHistorial(this.productoInventario.idProducto);

                    // Resetear formulario
                    this.ajuste = {
                        tipo: 'ENTRADA',
                        cantidad: 1,
                        motivo: ''
                    };

                    // Mostrar mensaje de éxito (opcional)
                    console.log('Stock actualizado correctamente');
                },
                error: (err) => {
                    console.error('Error al ajustar stock:', err);
                    this.errorMessage = err.error?.message || 'Error al actualizar el stock. Intente nuevamente.';
                }
            });
    }

    /**
     * Obtiene el ícono según el tipo de movimiento
     */
    getTipoMovimientoIcon(tipo: string): string {
        switch (tipo) {
            case 'ENTRADA': return 'bi-arrow-down-circle text-success';
            case 'SALIDA': return 'bi-arrow-up-circle text-danger';
            case 'AJUSTE': return 'bi-pencil-square text-info';
            case 'DEVOLUCION': return 'bi-arrow-return-left text-warning';
            default: return 'bi-circle';
        }
    }

    /**
     * Obtiene el texto legible del tipo de movimiento
     */
    getTipoMovimientoTexto(tipo: string): string {
        switch (tipo) {
            case 'ENTRADA': return 'Entrada';
            case 'SALIDA': return 'Salida';
            case 'AJUSTE': return 'Ajuste';
            case 'DEVOLUCION': return 'Devolución';
            default: return tipo;
        }
    }

    /**
     * Calcula el cambio de stock (+ para entrada, - para salida)
     */
    getCambioStock(movimiento: MovimientoInventario): string {
        const diferencia = movimiento.stockNuevo - movimiento.stockAnterior;
        return diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
    }
}
