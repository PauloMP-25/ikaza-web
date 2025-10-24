import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importa FormsModule para el formulario

import { ContactanosComponent } from './contactanos/contactanos';
import { ContactChannels } from './contact-channels/contact-channels';
import { LocationMap } from './location-map/location-map';
import { ContactForm } from './contact-form/contact-form';

@NgModule({
  declarations: [], // <-- DEJA ESTE ARREGLO VACÍO
  imports: [CommonModule, FormsModule, ContactanosComponent, ContactChannels, LocationMap, ContactForm]
})
export class ContactanosModule { }
