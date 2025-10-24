import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.prod';
import { ItemPedido } from '@core/models/pedido/pedido.model';


export interface PreferenceResponse {
  preference_id: string;
  preference_url: string;
  pedidoId: number;
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private apiUrl = `${environment.apiUrl}/api/webhooks/mercadopago`;


  constructor(private http: HttpClient) { }

  /**
   * Crea una preferencia de pago en Mercado Pago.
   * Ahora también crea un pedido preliminar en el backend.
   */
  crearPreferencia(items: ItemPedido[]): Observable<PreferenceResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<PreferenceResponse>(
      `${this.apiUrl}/create-preference`, 
      { items }, 
      { headers }
    );
  }
}
