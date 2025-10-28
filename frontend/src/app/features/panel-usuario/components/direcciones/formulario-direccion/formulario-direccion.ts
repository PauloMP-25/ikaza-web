// formulario-direccion.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Direccion, AddressInfo } from '@core/models/direcciones/direccion.model';
import { PlacePrediction } from '@core/models/direcciones/dtos-google-maps';
import { GoogleMapsService } from '@core/services/mapas/google-maps';
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

  /**
   * NUEVO: Detecta cambios en @Input() direccionParaEditar
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['direccionParaEditar'] && changes['direccionParaEditar'].currentValue) {
      this.cargarDireccionParaEditar();
    }

    //Resetear cuando se cancela la edición
    if (changes['editMode'] && !changes['editMode'].currentValue && changes['editMode'].previousValue) {
      this.resetForm();
    }
  }

  /**
   * ✅ MEJORADO: Carga la dirección en el formulario y prepara coordenadas
  */
  private cargarDireccionParaEditar(): void {
    if (!this.direccionParaEditar) return;

    const direccion = this.direccionParaEditar;

    console.log('📝 Cargando dirección para editar:', direccion);

    // ✅ Cargar valores en el formulario
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

    // ✅ Configurar coordenadas actuales si existen
    if (direccion.latitud && direccion.longitud) {
      this.coordenadasActuales = {
        lat: direccion.latitud,
        lng: direccion.longitud
      };

      console.log('🗺️ Coordenadas cargadas:', this.coordenadasActuales);

      //Opcional: Precargar barra de búsqueda con dirección completa
      this.searchQuery = this.construirDireccionCompleta(direccion);
    }
  }

  /**
   * NUEVO: Construye una representación legible de la dirección
   */
  private construirDireccionCompleta(direccion: Direccion): string {
    const partes = [
      direccion.direccion,
      direccion.distrito,
      direccion.provincia,
      direccion.region,
      direccion.pais
    ].filter(Boolean);

    return partes.join(', ');
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

  /**
   * CORREGIDO: Seleccionar un lugar y autocompletar TODOS los campos
   */
  selectPlace(place: PlacePrediction): void {
    console.log('📍 Lugar seleccionado:', place.description);

    this.googleMapsService.getPlaceDetailsByPlaceId(place.placeId).subscribe({
      next: (addressInfo) => {
        if (addressInfo) {
          console.log('Detalles obtenidos:', addressInfo);
          this.selectedPlace = addressInfo;
          this.autoCompletarDesdeGoogle(addressInfo);
        } else {
          console.warn('No se obtuvieron detalles del lugar');
        }
        this.showSearchResults = false;
        this.searchQuery = place.description;
      },
      error: (error) => {
        console.error('❌ Error al obtener detalles:', error);
        this.showSearchResults = false;
      }
    });
  }

  /**
   * MEJORADO: Autocompletar formulario INMEDIATAMENTE con TODOS los datos
   */
  private autoCompletarDesdeGoogle(addressInfo: AddressInfo): void {
    console.log('🔄 Iniciando autocompletado con:', addressInfo);

    // Construir dirección específica
    let direccionEspecifica = '';
    if (addressInfo.calle && addressInfo.numero) {
      direccionEspecifica = `${addressInfo.calle} ${addressInfo.numero}`.trim();
    } else if (addressInfo.calle) {
      direccionEspecifica = addressInfo.calle;
    } else {
      direccionEspecifica = addressInfo.direccionCompleta || '';
    }

    console.log('📝 Dirección específica construida:', direccionEspecifica);

    // Preparar datos para actualizar
    const datosActualizados = {
      direccion: direccionEspecifica,
      distrito: addressInfo.distrito || '',
      provincia: addressInfo.provincia || '',
      region: addressInfo.region || '',
      pais: addressInfo.pais || 'Perú',
      codigoPostal: addressInfo.codigoPostal || '',
      referencia: this.direccionForm.get('referencia')?.value || addressInfo.referencia || ''
    };

    console.log('📋 Datos a actualizar en formulario:', datosActualizados);

    // Actualizar formulario INMEDIATAMENTE
    this.direccionForm.patchValue(datosActualizados);

    // Actualizar coordenadas si existen
    if (addressInfo.coords) {
      this.direccionForm.patchValue({
        latitud: addressInfo.coords.lat,
        longitud: addressInfo.coords.lng
      });
      this.coordenadasActuales = addressInfo.coords;

      console.log('📍 Coordenadas actualizadas:', this.coordenadasActuales);

      // Geocodificación inversa para mejorar datos (opcional)
      this.googleMapsService.geocodeByCoords(
        addressInfo.coords.lat,
        addressInfo.coords.lng
      ).subscribe({
        next: (enhancedInfo) => {
          if (enhancedInfo) {
            console.log('🔍 Datos mejorados con geocodificación:', enhancedInfo);
            this.mejorarDatosUbicacion(enhancedInfo);
          }
        },
        error: (err) => {
          console.warn('⚠️ No se pudo mejorar con geocodificación:', err);
        }
      });
    }

    // LOG FINAL para verificar
    console.log('Formulario actualizado. Valores actuales:', {
      direccion: this.direccionForm.get('direccion')?.value,
      distrito: this.direccionForm.get('distrito')?.value,
      provincia: this.direccionForm.get('provincia')?.value,
      region: this.direccionForm.get('region')?.value,
      pais: this.direccionForm.get('pais')?.value,
      codigoPostal: this.direccionForm.get('codigoPostal')?.value
    });
  }

  /**
   * MEJORADO: Mejorar datos sin sobrescribir lo que ya está bien
   */
  private mejorarDatosUbicacion(addressInfo: AddressInfo): void {
    console.log('🔍 Mejorando datos de ubicación:', addressInfo);

    const formValues = this.direccionForm.value;

    // Solo actualizar campos vacíos o mejorar datos existentes
    const updates: any = {};

    if (!formValues.distrito || formValues.distrito.trim() === '') {
      updates.distrito = addressInfo.distrito || '';
    }

    if (!formValues.provincia || formValues.provincia.trim() === '') {
      updates.provincia = addressInfo.provincia || '';
    }

    if (!formValues.region || formValues.region.trim() === '') {
      updates.region = addressInfo.region || '';
    }

    if (!formValues.codigoPostal || formValues.codigoPostal.trim() === '') {
      updates.codigoPostal = addressInfo.codigoPostal || '';
    }

    // Actualizar solo si hay cambios
    if (Object.keys(updates).length > 0) {
      console.log('🔄 Actualizando campos vacíos:', updates);
      this.direccionForm.patchValue(updates);
    }

    this.selectedPlace = {
      direccionCompleta: addressInfo.direccionCompleta || '',
      calle: addressInfo.calle,
      numero: addressInfo.numero,
      distrito: addressInfo.distrito || formValues.distrito || '',
      provincia: addressInfo.provincia || formValues.provincia || '',
      region: addressInfo.region || formValues.region || '',
      pais: addressInfo.pais || 'Perú',
      codigoPostal: addressInfo.codigoPostal || formValues.codigoPostal || '',
      coords: addressInfo.coords,
      referencia: addressInfo.referencia || formValues.referencia || ''
    };

    console.log('Datos finales mejorados:', this.selectedPlace);
  }

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
    //Si hay coordenadas en el formulario, usarlas
    const lat = this.direccionForm.get('latitud')?.value;
    const lng = this.direccionForm.get('longitud')?.value;

    if (lat && lng) {
      this.coordenadasActuales = { lat, lng };
      console.log('🗺️ Abriendo mapa con coordenadas:', this.coordenadasActuales);
    } else {
      console.log('📍 Abriendo mapa sin coordenadas previas');
    }

    this.mostrarModalMapa = true;
  }

  cerrarModalMapa(): void {
    this.mostrarModalMapa = false;
  }

  /**
    * CORREGIDO: Actualizar formulario completamente al confirmar desde mapa
    */
  onDireccionConfirmada(addressInfo: AddressInfo): void {
    console.log('✅ Dirección confirmada desde mapa:', addressInfo);

    // Construir dirección específica
    let direccionEspecifica = '';
    if (addressInfo.calle && addressInfo.numero) {
      direccionEspecifica = `${addressInfo.calle} ${addressInfo.numero}`.trim();
    } else if (addressInfo.calle) {
      direccionEspecifica = addressInfo.calle;
    } else {
      direccionEspecifica = addressInfo.direccionCompleta || '';
    }

    //Autocompletar TODO el formulario
    this.direccionForm.patchValue({
      direccion: direccionEspecifica,
      distrito: addressInfo.distrito || '',
      provincia: addressInfo.provincia || '',
      region: addressInfo.region || '',
      pais: addressInfo.pais || 'Perú',
      codigoPostal: addressInfo.codigoPostal || '',
      referencia: this.direccionForm.get('referencia')?.value || addressInfo.referencia || '',
      latitud: addressInfo.coords?.lat || null,
      longitud: addressInfo.coords?.lng || null
    });

    if (addressInfo.coords) {
      this.coordenadasActuales = addressInfo.coords;
    }

    this.searchQuery = addressInfo.direccionCompleta;
    this.selectedPlace = addressInfo;

    console.log('Formulario actualizado desde mapa:', this.direccionForm.value);

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