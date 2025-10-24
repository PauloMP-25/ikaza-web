import { Pipe, PipeTransform } from '@angular/core';
import { Producto } from '@core/models/productos/producto-backend.model';

@Pipe({
  name: 'filterByCategory',
  standalone: true  // Para que sea standalone y fácil de importar
})
export class FilterByCategoryPipe implements PipeTransform {
  transform(products: Producto[] | null, category: string): Producto[] {
    if (!products || category === 'todos') {
      return products || [];  // Si es 'todos', devuelve todos
    }
    return products.filter(product => product.nombreCategoria === category);
  }
}
