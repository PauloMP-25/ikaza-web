import { Component } from '@angular/core';
import { ContactChannels } from '../contact-channels/contact-channels';
import { LocationMap } from '../location-map/location-map';
import { ContactForm } from '../contact-form/contact-form';

@Component({
  selector: 'app-contactanos',
  standalone: true,
  imports: [ContactChannels, LocationMap, ContactForm],
  templateUrl: './contactanos.html',
  styleUrl: './contactanos.scss'
})
export class ContactanosComponent {

}
