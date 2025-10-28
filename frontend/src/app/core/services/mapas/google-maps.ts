import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AddressInfo } from '@core/models/direcciones/direccion.model';
import { PlaceDetailsResponse, PlacePrediction, AutocompleteResponse, GeocodeResponse } from '@core/models/direcciones/dtos-google-maps';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  // Ahora usamos tu backend como proxy
  private baseUrl = `${environment.apiUrl}/api/google-maps`;

  constructor(private http: HttpClient) { }

  /**
   * REFACTORIZADO: Autocompletado a través del backend
   */
  getAutocompletePredictions(input: string, countryCode: string = 'pe'): Observable<PlacePrediction[]> {
    if (input.length < 3) {
      return of([]);
    }

    const url = `${this.baseUrl}/autocomplete?input=${encodeURIComponent(input)}&country=${countryCode}`;

    return this.http.get<AutocompleteResponse>(url).pipe(
      map(response => {
        //Acceder directamente a predictions (no hay wrapper status)
        if (!response || !response.predictions) {
          console.warn('No se encontraron resultados en predictions');
          return [];
        }

        return response.predictions.slice(0, 10).map(p => ({
          description: p.description,
          placeId: p.place_id
        }));
      }),
      catchError(err => {
        console.error('❌ Error en Autocomplete:', err);
        return of([]);
      })
    );
  }

  /**
   * REFACTORIZADO: Detalles del lugar por placeId
   */
  getPlaceDetailsByPlaceId(placeId: string): Observable<AddressInfo | null> {
    const url = `${this.baseUrl}/place-details?placeId=${placeId}`;

    return this.http.get<PlaceDetailsResponse>(url).pipe(
      map(response => {
        //Acceder directamente a result (no hay wrapper status)
        if (!response || !response.result) {
          console.error('❌ Error: No se encontró result en Place Details');
          return null;
        }

        return this.formatearDireccionFromDetails(response.result);
      }),
      catchError(err => {
        console.error('❌ Error en Place Details:', err);
        return of(null);
      })
    );
  }

  /**
   * REFACTORIZADO: Geocodificación inversa (coordenadas → dirección)
   */
  geocodeByCoords(lat: number, lng: number): Observable<AddressInfo | null> {
    const url = `${this.baseUrl}/geocode?lat=${lat}&lng=${lng}`;

    return this.http.get<GeocodeResponse>(url).pipe(
      map(response => {
        //Verificar status y results correctamente
        if (!response || response.status !== 'OK' || !response.results || response.results.length === 0) {
          console.warn('⚠️ No se encontraron resultados en geocoding');
          return null;
        }

        return this.formatearDireccionFromDetails(response.results[0]);
      }),
      catchError(err => {
        console.error('❌ Error en Geocoding:', err);
        return of(null);
      })
    );
  }

  /**
   * Mapea result/results de Google a AddressInfo
   */
  private formatearDireccionFromDetails(result: any): AddressInfo | null {
    if (!result) {
      return null;
    }

    // Función auxiliar para encontrar componentes de dirección
    const find = (type: string) => {
      if (!result.address_components) return null;
      const component = result.address_components.find((c: any) => c.types.includes(type));
      return component?.long_name || null;
    };

    const locality = find("locality");
    const sublocality = find("sublocality") || find("sublocality_level_1");
    const admin2 = find("administrative_area_level_2");
    const admin1 = find("administrative_area_level_1");

    return {
      direccionCompleta: result.formatted_address || '',
      calle: find("route"),
      numero: find("street_number"),
      distrito: sublocality || locality || null,
      provincia: admin2 || locality || null,
      region: admin1,
      codigoPostal: find("postal_code"),
      pais: find("country"),
      referencia: null,
      coords: result.geometry?.location ? {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      } : null
    };
  }
}