// modal-mapa.component.ts
import { Component, Output, EventEmitter, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsService } from '@core/services/mapas/google-maps';
import { AddressInfo } from '@core/models/direcciones/direccion.model';
import { PlacePrediction } from '@core/models/direcciones/dtos-google-maps';
import { environment } from 'src/environments/environment';

declare var google: any;

@Component({
  selector: 'app-mapa-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-modal.html',
  styleUrl: './mapa-modal.scss'
})

export class MapaModal implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;

  @Input() coordenadasIniciales?: { lat: number, lng: number };
  @Output() onConfirmar = new EventEmitter<AddressInfo>();
  @Output() onCerrar = new EventEmitter<void>();

  map: any;
  marker: any;
  searchQuery: string = '';
  placePredictions: PlacePrediction[] = [];
  showSearchResults: boolean = false;
  selectedAddress: AddressInfo | null = null;
  googleMapsApiKey: string = environment.googleMapsApiKey;

  //Estados de carga
  isLoadingMap: boolean = true;
  isGeolocating: boolean = false;
  isGeocoding: boolean = false;
  geoLocationError: string = '';

  // Coordenadas por defecto (Ica, Perú)
  defaultCoords = { lat: -14.0678, lng: -75.7286 };

  constructor(private googleMapsService: GoogleMapsService) { }

  ngOnInit(): void {
    console.log('Inicializando mapa modal con coordenadas:', this.coordenadasIniciales);
    this.loadGoogleMaps();
  }

  private loadGoogleMaps(): void {
    setTimeout(() => {
      if (typeof google !== 'undefined' && google.maps) {
        this.initMap();
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => this.initMap();
        script.onerror = () => {
          this.isLoadingMap = false;
          console.error('❌ Error al cargar Google Maps');
        };
        document.head.appendChild(script);
      }
    }, 100);
  }

  private initMap(): void {
    const coords = this.coordenadasIniciales || this.defaultCoords;

    console.log('📍 Inicializando mapa en:', coords);

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: coords,
      zoom: this.coordenadasIniciales ? 17 : 13, //Zoom 13 para vista general de Ica
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      //Restricción para Perú (ayuda con búsquedas)
      restriction: {
        latLngBounds: {
          north: -0.0,    // Norte de Perú
          south: -18.5,   // Sur de Perú
          west: -81.5,    // Oeste de Perú
          east: -68.5     // Este de Perú
        },
        strictBounds: false //Permite scroll fuera pero centra en Perú
      }
    });

    this.marker = new google.maps.Marker({
      position: coords,
      map: this.map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      title: 'Arrastra para ajustar la ubicación'
    });

    this.marker.addListener('dragend', () => {
      const position = this.marker.getPosition();
      this.geocodePosition(position.lat(), position.lng());
    });

    this.map.addListener('click', (event: any) => {
      this.marker.setPosition(event.latLng);
      this.geocodePosition(event.latLng.lat(), event.latLng.lng());
    });

    google.maps.event.addListenerOnce(this.map, 'idle', () => {
      this.isLoadingMap = false;
      console.log('Mapa cargado completamente');
    });

    if (this.coordenadasIniciales) {
      console.log('Geocodificando posición inicial...');
      this.geocodePosition(coords.lat, coords.lng);
    }
  }

  /**
   * Geocodifica las coordenadas y actualiza selectedAddress
   */
  private geocodePosition(lat: number, lng: number): void {
    console.log('🔍 Geocodificando:', { lat, lng });

    this.isGeocoding = true;

    this.googleMapsService.geocodeByCoords(lat, lng).subscribe({
      next: (addressInfo) => {
        if (addressInfo) {
          this.selectedAddress = addressInfo;
          console.log('Dirección geocodificada:', addressInfo);
          this.searchQuery = addressInfo.direccionCompleta;
        }
        this.isGeocoding = false;
      },
      error: (error) => {
        console.error('❌ Error en geocodificación:', error);
        this.isGeocoding = false;
      }
    });
  }

  /**
   * Detectar ubicación actual del usuario
   */
  detectarUbicacionActual(): void {
    if (!navigator.geolocation) {
      this.geoLocationError = 'Tu navegador no soporta geolocalización';
      console.error('❌ Geolocalización no soportada');
      return;
    }

    this.isGeolocating = true;
    this.geoLocationError = '';

    console.log('📍 Solicitando ubicación actual del GPS...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log('Ubicación GPS obtenida:', {
          lat,
          lng,
          accuracy: `${accuracy.toFixed(0)}m`
        });

        const newPosition = new google.maps.LatLng(lat, lng);
        this.map.setCenter(newPosition);
        this.map.setZoom(17);
        this.marker.setPosition(newPosition);

        this.geocodePosition(lat, lng);

        this.isGeolocating = false;
      },
      (error) => {
        this.isGeolocating = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.geoLocationError = 'Debes permitir el acceso a tu ubicación en el navegador';
            console.error('❌ Permiso de ubicación denegado');
            break;
          case error.POSITION_UNAVAILABLE:
            this.geoLocationError = 'No se pudo obtener tu ubicación. Verifica tu GPS';
            console.error('❌ Ubicación no disponible');
            break;
          case error.TIMEOUT:
            this.geoLocationError = 'Tiempo de espera agotado. Intenta de nuevo';
            console.error('❌ Timeout de geolocalización');
            break;
          default:
            this.geoLocationError = 'Error desconocido al obtener ubicación';
            console.error('❌ Error desconocido:', error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
  * Búsqueda en barra del modal
  */
  onSearchInput(): void {
    if (this.searchQuery.length > 2) {
      //Forzar búsqueda en Perú
      this.googleMapsService.getAutocompletePredictions(this.searchQuery, 'pe').subscribe({
        next: (predictions) => {
          this.placePredictions = predictions;
          this.showSearchResults = predictions.length > 0;
          console.log(`🔍 ${predictions.length} resultados encontrados`);
        },
        error: (error) => {
          console.error('❌ Error en búsqueda:', error);
          this.placePredictions = [];
          this.showSearchResults = false;
        }
      });
    } else {
      this.placePredictions = [];
      this.showSearchResults = false;
    }
  }

  onSearchFocus(): void {
    if (this.searchQuery.length > 2 && this.placePredictions.length > 0) {
      this.showSearchResults = true;
    }
  }

  /**
   * Seleccionar lugar desde búsqueda
   */
  selectPlace(place: PlacePrediction): void {
    console.log('📍 Lugar seleccionado desde búsqueda:', place.description);

    this.googleMapsService.getPlaceDetailsByPlaceId(place.placeId).subscribe({
      next: (addressInfo) => {
        if (addressInfo && addressInfo.coords) {
          this.selectedAddress = addressInfo;
          this.searchQuery = place.description;
          this.showSearchResults = false;

          const position = new google.maps.LatLng(
            addressInfo.coords.lat,
            addressInfo.coords.lng
          );
          this.map.setCenter(position);
          this.map.setZoom(17);
          this.marker.setPosition(position);

          console.log('Mapa movido a:', addressInfo.coords);
        } else {
          console.warn('No se obtuvieron coordenadas del lugar');
        }
      },
      error: (error) => {
        console.error('Error al obtener detalles:', error);
      }
    });
  }

  /**
   * MEJORADO: Confirmar dirección con validación
   */
  confirmarDireccion(): void {
    if (!this.selectedAddress) {
      console.warn('No hay dirección seleccionada');
      alert('⚠️ Por favor, selecciona una ubicación en el mapa antes de confirmar.');
      return;
    }

    if (!this.selectedAddress.coords ||
      !this.isValidCoordinate(this.selectedAddress.coords.lat) ||
      !this.isValidCoordinate(this.selectedAddress.coords.lng)) {
      console.error('Coordenadas inválidas:', this.selectedAddress.coords);
      alert('Las coordenadas seleccionadas no son válidas. Por favor, selecciona otra ubicación.');
      return;
    }

    if (!this.isInPeruRange(this.selectedAddress.coords.lat, this.selectedAddress.coords.lng)) {
      const confirmar = confirm(
        'Las coordenadas seleccionadas parecen estar fuera de Perú.\n\n' +
        `Latitud: ${this.selectedAddress.coords.lat.toFixed(6)}\n` +
        `Longitud: ${this.selectedAddress.coords.lng.toFixed(6)}\n\n` +
        '¿Deseas continuar de todas formas?'
      );

      if (!confirmar) {
        return;
      }
    }

    console.log('Confirmando dirección válida:', this.selectedAddress);
    this.onConfirmar.emit(this.selectedAddress);
  }

  private isValidCoordinate(coord: number | null | undefined): boolean {
    if (coord === null || coord === undefined) return false;
    if (isNaN(coord)) return false;
    if (!isFinite(coord)) return false;
    return true;
  }

  private isInPeruRange(lat: number, lng: number): boolean {
    return lat >= -18.5 && lat <= -0.0 && lng >= -81.5 && lng <= -68.5;
  }

  cerrar(): void {
    this.onCerrar.emit();
  }
}