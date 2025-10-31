// contacto.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ContactoRequest {
    nombre: string;
    email: string;
    mensaje: string;
}

export interface ContactoResponse {
    success: boolean;
    mensaje: string;
}

@Injectable({
    providedIn: 'root'
})
export class ContactoService {
    private apiUrl = `${environment.apiUrl}/api/contacto`;

    constructor(private http: HttpClient) { }

    enviarMensaje(contacto: ContactoRequest): Observable<ContactoResponse> {
        return this.http.post<ContactoResponse>(`${this.apiUrl}/enviar`, contacto);
    }
}