// formulario-direccion.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Direccion, AddressInfo } from '@core/models/direcciones/direccion.model';
import { GoogleMapsService, PlacePrediction } from '@core/services/mapas/google-maps';
import { MapaModal } from '../mapa-modal/mapa-modal';

@Component({
  selector: 'app-formulario-direccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapaModal],
  templateUrl: './formulario-direccion.html',
  styleUrl: './formulario-direccion.scss'
})

export class FormularioDireccion implements OnInit {
  @ViewChild('searchResults') searchResults!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;

  @Input() direccionParaEditar: Direccion | null = null;
  @Input() editMode: boolean = false;
  @Input() isLoading: boolean = false;

  @Output() onGuardar = new EventEmitter<Direccion>();
  @Output() onCancelar = new EventEmitter<void>();

  direccionForm: FormGroup;
  mostrarModalMapa: boolean = false;
  coordenadasActuales?: { lat: number, lng: number };

  // Variables para búsqueda en barra del formulario
  searchQuery: string = '';
  placePredictions: PlacePrediction[] = [];
  selectedPlace: AddressInfo | null = null;
  showSearchResults: boolean = false;

  constructor(
    private fb: FormBuilder,
    private googleMapsService: GoogleMapsService
  ) {
    this.direccionForm = this.fb.group({
      alias: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      pais: ['Perú', [Validators.required, Validators.maxLength(100)]],
      region: ['', [Validators.required, Validators.maxLength(100)]],
      provincia: ['', [Validators.required, Validators.maxLength(100)]],
      distrito: ['', [Validators.required, Validators.maxLength(100)]],
      referencia: ['', [Validators.maxLength(500)]],
      codigoPostal: ['', [Validators.maxLength(10)]],
      latitud: [null],
      longitud: [null],
      esPrincipal: [false]
    });
  }

  ngOnInit(): void {
    if (this.direccionParaEditar) {
      this.cargarDireccionParaEditar();
    }
  }

  private cargarDireccionParaEditar(): void {
    if (!this.direccionParaEditar) return;

    const direccion = this.direccionParaEditar;

    this.direccionForm.patchValue({
      alias: direccion.alias || '',
      direccion: direccion.direccion || '',
      referencia: direccion.referencia || '',
      codigoPostal: direccion.codigoPostal || '',
      pais: direccion.pais || 'Perú',
      region: direccion.region || '',
      provincia: direccion.provincia || '',
      distrito: direccion.distrito || '',
      latitud: direccion.latitud || null,
      longitud: direccion.longitud || null,
      esPrincipal: direccion.esPrincipal || false
    });

    // Guardar coordenadas actuales si existen
    if (direccion.latitud && direccion.longitud) {
      this.coordenadasActuales = {
        lat: direccion.latitud,
        lng: direccion.longitud
      };
    }
  }
  
  // ========== MÉTODO 1: BÚSQUEDA EN BARRA DEL FORMULARIO ==========
  
  /**
   * Búsqueda en Google Maps (barra del formulario)
   */
  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;

    if (query.length > 2) {
      this.googleMapsService.getAutocompletePredictions(query).subscribe({
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

  /**
   * Seleccionar un lugar de Google Maps (desde barra)
   */
  selectPlace(place: PlacePrediction): void {
    this.googleMapsService.getPlaceDetailsByPlaceId(place.placeId).subscribe({
      next: (addressInfo) => {
        if (addressInfo) {
          this.selectedPlace = addressInfo;
          this.autoCompletarDesdeGoogle(addressInfo);
        }
        this.showSearchResults = false;
        this.searchQuery = place.description;
      },
      error: (error) => {
        console.error('Error al obtener detalles:', error);
      }
    });
  }

  /**
   * Autocompletar formulario con datos de Google Maps (barra de búsqueda)
   */
  private autoCompletarDesdeGoogle(addressInfo: AddressInfo): void {
    setTimeout(() => {
      this.direccionForm.patchValue({
        direccion: `${addressInfo.calle || ''} ${addressInfo.numero || ''}`.trim() || addressInfo.direccionCompleta,
        referencia: addressInfo.referencia || this.direccionForm.get('referencia')?.value,
        codigoPostal: addressInfo.codigoPostal || '',
        pais: addressInfo.pais || 'Perú',
        region: addressInfo.region || '',
        provincia: addressInfo.provincia || '',
        distrito: addressInfo.distrito || '',
      });
      
      if (addressInfo.coords) {
        this.direccionForm.patchValue({
          latitud: addressInfo.coords.lat,
          longitud: addressInfo.coords.lng
        });
        this.coordenadasActuales = addressInfo.coords;
        
        // Geocodificación para mejorar datos
        this.googleMapsService.geocodeByCoords(
          addressInfo.coords.lat,
          addressInfo.coords.lng
        ).subscribe(enhancedInfo => {
          if (enhancedInfo) {
            this.mejorarDatosUbicacion(enhancedInfo);
          }
        });
      } else {
        this.selectedPlace = addressInfo;
      }
    }, 100);
  }

  /**
   * Mejorar datos de ubicación con geocodificación inversa
   */
  private mejorarDatosUbicacion(addressInfo: AddressInfo): void {
    console.log('🔍 Mejorando datos de ubicación:', addressInfo);

    const calleCompleta = addressInfo.calle || '';
    const direccionRefinada = calleCompleta.includes(addressInfo.numero || '')
      ? calleCompleta
      : `${calleCompleta} ${addressInfo.numero || ''}`.trim();

    this.selectedPlace = {
      direccionCompleta: addressInfo.direccionCompleta || direccionRefinada || '',
      calle: direccionRefinada,
      numero: addressInfo.numero || null,
      distrito: addressInfo.distrito || '',
      provincia: addressInfo.provincia || '',
      region: addressInfo.region || '',
      pais: addressInfo.pais || 'Perú',
      codigoPostal: addressInfo.codigoPostal || '',
      coords: addressInfo.coords,
      referencia: addressInfo.referencia || ''
    };

    this.direccionForm.patchValue({
      region: this.selectedPlace.region,
      provincia: this.selectedPlace.provincia,
      distrito: this.selectedPlace.distrito,
      pais: this.selectedPlace.pais,
      codigoPostal: this.selectedPlace.codigoPostal
    });

    console.log('✅ Datos mejorados y seteados en form:', this.selectedPlace);
  }

  /**
   * Cierra el dropdown al hacer clic fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.searchResults?.nativeElement.contains(event.target) ||
      this.searchInput?.nativeElement.contains(event.target);

    if (!clickedInside && this.showSearchResults) {
      this.showSearchResults = false;
    }
  }

  /**
   * Maneja el foco en el input de búsqueda
   */
  onSearchFocus(): void {
    if (this.searchQuery.length > 2 && this.placePredictions.length > 0) {
      this.showSearchResults = true;
    }
  }

  // ========== MÉTODO 2: MODAL DEL MAPA ==========

  abrirModalMapa(): void {
    // Si hay coordenadas en el formulario, usarlas
    const lat = this.direccionForm.get('latitud')?.value;
    const lng = this.direccionForm.get('longitud')?.value;

    if (lat && lng) {
      this.coordenadasActuales = { lat, lng };
    }

    this.mostrarModalMapa = true;
  }

  cerrarModalMapa(): void {
    this.mostrarModalMapa = false;
  }

  onDireccionConfirmada(addressInfo: AddressInfo): void {
    console.log('✅ Dirección confirmada desde mapa:', addressInfo);

    // Autocompletar formulario con datos del mapa
    this.direccionForm.patchValue({
      direccion: `${addressInfo.calle || ''} ${addressInfo.numero || ''}`.trim() || addressInfo.direccionCompleta,
      pais: addressInfo.pais || 'Perú',
      region: addressInfo.region || '',
      provincia: addressInfo.provincia || '',
      distrito: addressInfo.distrito || '',
      codigoPostal: addressInfo.codigoPostal || '',
      referencia: addressInfo.referencia || this.direccionForm.get('referencia')?.value,
      latitud: addressInfo.coords?.lat || null,
      longitud: addressInfo.coords?.lng || null
    });

    // Actualizar coordenadas actuales
    if (addressInfo.coords) {
      this.coordenadasActuales = addressInfo.coords;
    }

    this.cerrarModalMapa();
  }

    // ========== MÉTODO 3: MANUAL (Ya funciona por defecto en el formulario) =========

  onSubmit(): void {
    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      return;
    }

    const formValue = this.direccionForm.value;

    const direccion: Direccion = {
      idDireccion: this.direccionParaEditar?.idDireccion,
      alias: formValue.alias,
      direccion: formValue.direccion,
      distrito: formValue.distrito,
      provincia: formValue.provincia,
      region: formValue.region,
      referencia: formValue.referencia || null,
      codigoPostal: formValue.codigoPostal || null,
      pais: formValue.pais,
      latitud: formValue.latitud,
      longitud: formValue.longitud,
      esPrincipal: formValue.esPrincipal
    };

    this.onGuardar.emit(direccion);
  }

  resetForm(): void {
    this.direccionForm.reset({
      pais: 'Perú',
      esPrincipal: false
    });
    this.coordenadasActuales = undefined;
    this.searchQuery = '';
    this.placePredictions = [];
    this.showSearchResults = false;
    this.selectedPlace = null;
  }
}