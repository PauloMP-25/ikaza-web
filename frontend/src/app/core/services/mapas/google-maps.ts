import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AddressInfo } from '@core/models/direcciones/direccion.model';

// Nuevas Interfaces para la respuesta de Places Autocomplete y Details
export interface PlacePrediction {
  description: string;
  placeId: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  // Ahora usamos tu backend como proxy
  private baseUrl = `${environment.apiUrl}/api/google-maps`;

  constructor(private http: HttpClient) { }

  /**
  * Autocompletado a través de tu backend
  */
  getAutocompletePredictions(input: string, countryCode: string = 'pe'): Observable<PlacePrediction[]> {
    if (input.length < 3) {
      return of([]);
    }

    const url = `${this.baseUrl}/autocomplete?input=${encodeURIComponent(input)}&country=${countryCode}`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.status !== 'OK' || !response.predictions) {
          console.warn('No se encontraron resultados:', response.status);
          return [];
        }
        return response.predictions.slice(0, 10).map((p: any) => ({
          description: p.description,
          placeId: p.place_id
        }));
      }),
      catchError(err => {
        console.error('Error en Autocomplete:', err);
        return of([]);
      })
    );
  }

  /**
   * Detalles del lugar a través de tu backend
   */
  getPlaceDetailsByPlaceId(placeId: string): Observable<AddressInfo | null> {
    const url = `${this.baseUrl}/place-details?placeId=${placeId}`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.status !== 'OK' || !response.result) {
          console.error('Error en Place Details:', response.status);
          return null;
        }
        return this.formatearDireccionFromDetails(response.result);
      }),
      catchError(err => {
        console.error('Error en la API de Place Details:', err);
        return of(null);
      })
    );
  }

  /**
   * Geocodificación a través de tu backend
   */
  geocodeByCoords(lat: number, lng: number): Observable<AddressInfo | null> {
    const url = `${this.baseUrl}/geocode?lat=${lat}&lng=${lng}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.status !== 'OK' || !response.results || response.results.length === 0) {
          return null;
        }
        return this.formatearDireccionFromDetails(response.results[0]);
      }),
      catchError(err => {
        console.error('Error en Geocoding:', err);
        return of(null);
      })
    );
  }

  /**
   * Mapea la respuesta de Place Details a nuestra interfaz AddressInfo.
   */
  private formatearDireccionFromDetails(result: any): AddressInfo | null {
    if (!result.address_components) {
      return null;
    }

    const find = (type: string) => {
      const component = result.address_components.find((c: any) => c.types.includes(type));
      return component?.long_name || null;
    };

    const locality = find("locality");
    const sublocality = find("sublocality") || find("sublocality_level_1");
    const admin2 = find("administrative_area_level_2");
    const admin1 = find("administrative_area_level_1");

    return {
      direccionCompleta: result.formatted_address,
      calle: find("route"),
      numero: find("street_number"),
      distrito: sublocality || locality || null,
      provincia: admin2 || locality || null,
      region: admin1,
      codigoPostal: find("postal_code"),
      pais: find("country"),
      referencia: null, // El usuario puede completar esto manualmente
      coords: result.geometry?.location ? {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      } : null
    };
  }
}