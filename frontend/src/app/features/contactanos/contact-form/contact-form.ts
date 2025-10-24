import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  ngAfterViewInit(): void {
    // Inicializamos la instancia del modal de Bootstrap
    this.modalInstance = new bootstrap.Modal(this.contactModal.nativeElement);
  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      // Aquí iría la lógica para enviar el formulario a un backend
      console.log('Formulario enviado:', form.value);

      alert('Mensaje enviado. ¡Gracias por contactarnos!');

      // Cierra el modal y resetea el formulario
      this.modalInstance.hide();
      form.reset();
    }
  }
}