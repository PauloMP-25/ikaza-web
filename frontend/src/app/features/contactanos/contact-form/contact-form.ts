import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactoService } from '@core/services/contacto/contacto.service';

// Importa Bootstrap para poder usarlo en TypeScript
declare var bootstrap: any;

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-form.html',
  styleUrls: ['./contact-form.scss']
})
export class ContactForm implements AfterViewInit {
  @ViewChild('contactModal') contactModal!: ElementRef;
  private modalInstance: any;

  isSubmitting = false;
  mensajeEstado: { tipo: 'success' | 'error', texto: string } | null = null;

  constructor(private contactoService: ContactoService) { }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.contactModal.nativeElement);
  }

  onSubmit(form: NgForm): void {
    if (form.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.mensajeEstado = null;

      const contactoData = {
        nombre: form.value.nombre,
        email: form.value.email,
        mensaje: form.value.mensaje
      };
      this.contactoService.enviarMensaje(contactoData).subscribe({
        next: (response) => {
          this.isSubmitting = false;

          if (response.success) {
            this.mensajeEstado = {
              tipo: 'success',
              texto: response.mensaje
            };

            // Esperar 2 segundos antes de cerrar el modal
            setTimeout(() => {
              this.modalInstance.hide();
              form.reset();
              this.mensajeEstado = null;
            }, 2000);
          } else {
            this.mensajeEstado = {
              tipo: 'error',
              texto: response.mensaje
            };
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error al enviar mensaje:', error);
          this.mensajeEstado = {
            tipo: 'error',
            texto: 'Hubo un error al enviar tu mensaje. Por favor, intenta nuevamente.'
          };
        }
      });
    }
  }
}