// modal-mapa.component.ts
import { Component, Output, EventEmitter, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsService, PlacePrediction } from '@core/services/mapas/google-maps';
import { AddressInfo } from '@core/models/direcciones/direccion.model';
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


  // Coordenadas por defecto (Ica, Perú)
  defaultCoords = { lat: -14.0678, lng: -75.7286 };

  constructor(private googleMapsService: GoogleMapsService) { }

  ngOnInit(): void {
    this.loadGoogleMaps();
  }

  private loadGoogleMaps(): void {
    // Esperar a que el DOM esté listo
    setTimeout(() => {
      if (typeof google !== 'undefined' && google.maps) {
        this.initMap();
      } else {
        // Cargar script de Google Maps si no está cargado
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places`;

        script.async = true;
        script.defer = true;
        script.onload = () => this.initMap();
        document.head.appendChild(script);
      }
    }, 100);
  }

  private initMap(): void {
    const coords = this.coordenadasIniciales || this.defaultCoords;

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: coords,
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    });

    // Crear marcador arrastrable
    this.marker = new google.maps.Marker({
      position: coords,
      map: this.map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      title: 'Arrastra para ajustar la ubicación'
    });

    // Evento cuando se arrastra el marcador
    this.marker.addListener('dragend', () => {
      const position = this.marker.getPosition();
      this.geocodePosition(position.lat(), position.lng());
    });

    // Evento click en el mapa
    this.map.addListener('click', (event: any) => {
      this.marker.setPosition(event.latLng);
      this.geocodePosition(event.latLng.lat(), event.latLng.lng());
    });

    // Geocodificar posición inicial
    if (this.coordenadasIniciales) {
      this.geocodePosition(coords.lat, coords.lng);
    }
  }

  private geocodePosition(lat: number, lng: number): void {
    this.googleMapsService.geocodeByCoords(lat, lng).subscribe({
      next: (addressInfo) => {
        if (addressInfo) {
          this.selectedAddress = addressInfo;
          console.log('📍 Dirección geocodificada:', addressInfo);
        }
      },
      error: (error) => {
        console.error('Error en geocodificación:', error);
      }
    });
  }

  onSearchInput(): void {
    if (this.searchQuery.length > 2) {
      this.googleMapsService.getAutocompletePredictions(this.searchQuery).subscribe({
        next: (predictions) => {
          this.placePredictions = predictions;
          this.showSearchResults = predictions.length > 0;
        },
        error: (error) => {
          console.error('Error en búsqueda:', error);
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

  selectPlace(place: PlacePrediction): void {
    this.googleMapsService.getPlaceDetailsByPlaceId(place.placeId).subscribe({
      next: (addressInfo) => {
        if (addressInfo && addressInfo.coords) {
          this.selectedAddress = addressInfo;
          this.searchQuery = place.description;
          this.showSearchResults = false;

          // Mover mapa y marcador
          const position = new google.maps.LatLng(
            addressInfo.coords.lat,
            addressInfo.coords.lng
          );
          this.map.setCenter(position);
          this.map.setZoom(17);
          this.marker.setPosition(position);
        }
      },
      error: (error) => {
        console.error('Error al obtener detalles:', error);
      }
    });
  }

  confirmarDireccion(): void {
    if (this.selectedAddress) {
      this.onConfirmar.emit(this.selectedAddress);
    }
  }

  cerrar(): void {
    this.onCerrar.emit();
  }
}