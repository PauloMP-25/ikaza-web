// formulario-direccion.component.ts
import { Component, Input, Output, EventEmitter, OnInit, HostListener, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Direccion, DireccionDTO } from '@core/models/direcciones/direccion.model';

@Component({
  selector: 'app-formulario-direccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario-direccion.html',
  styleUrl: './formulario-direccion.scss'
})

export class FormularioDireccion implements OnInit {
  @Input() direccionParaEditar: Direccion | null = null;
  @Input() editMode: boolean = false;
  @Input() isLoading: boolean = false;

  @Output() onGuardar = new EventEmitter<Direccion>();
  @Output() onCancelar = new EventEmitter<void>();

  direccionForm: FormGroup;
  mostrarModalMapa: boolean = false;

  constructor(
    private fb: FormBuilder,
  ) {
    this.direccionForm = this.fb.group({
      alias: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      pais: [{ value: 'Perú', disabled: true }, [Validators.maxLength(100)]],
      region: ['', [Validators.required, Validators.maxLength(100)]],
      provincia: ['', [Validators.required, Validators.maxLength(100)]],
      distrito: ['', [Validators.required, Validators.maxLength(100)]],
      referencia: ['', [Validators.maxLength(500)]],
      esPrincipal: [false]
    });
  }

  ngOnInit(): void {
    // Si estamos editando y el form no está creado, cargar la dirección
    if (this.direccionParaEditar && !this.direccionForm.dirty) {
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
   * Carga la dirección para editar en el formulario.
   */
  private cargarDireccionParaEditar(): void {
    if (!this.direccionParaEditar) return;

    const direccion = this.direccionParaEditar;

    console.log('📝 Cargando dirección para editar:', direccion);

    this.direccionForm.patchValue({
      alias: direccion.alias || '',
      direccion: direccion.direccion || '',
      referencia: direccion.referencia || '',
      pais: direccion.pais || 'Perú',
      region: direccion.region || '',
      provincia: direccion.provincia || '',
      distrito: direccion.distrito || '',
      esPrincipal: direccion.esPrincipal || false
    });

    this.direccionForm.get('pais')?.disable();
  }

  isInvalid(controlName: string, errorType?: string): boolean {
    const control = this.direccionForm.get(controlName);
    if (!control) return false;

    if (!errorType) {
      return control.invalid && (control.dirty || control.touched);
    }

    return control.hasError(errorType) && (control.dirty || control.touched);
  }

  onSubmit(): void {
    this.direccionForm.get('pais')?.enable();
    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      this.direccionForm.get('pais')?.disable();
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
      pais: formValue.pais,
      esPrincipal: formValue.esPrincipal
    };

    this.onGuardar.emit(direccion);
    this.direccionForm.get('pais')?.disable();
  }

  resetForm(): void {
    this.direccionForm.reset({
      pais: 'Perú',
      esPrincipal: false
    });
    this.direccionForm.get('pais')?.disable();
  }
}
