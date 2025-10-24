// src/app/services/servicios-metodos-pago/servicio-culqui/servicio-culqui.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CulqiChargeResponse {
    success: boolean;
    data?: any;
    error?: string;
    transactionId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CulqiService {
    private apiUrl = `${environment.apiUrl}/api/webhooks/mercadopago`;

    constructor(private http: HttpClient) { }

    /**
     * Procesa un cargo con Culqi usando el token generado.
     */
    charge(token: string, amount: number): Observable<CulqiChargeResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<CulqiChargeResponse>(
            `${this.apiUrl}/charge`,
            { token, amount },
            { headers }
        );
    }
}
