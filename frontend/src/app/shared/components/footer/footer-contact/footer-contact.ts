import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer-contact',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer-contact.html',
  styleUrls: ['./footer-contact.scss']
})
export class FooterContactComponent {
  phone = '+51 987 654 321';
  email = 'ikaza.import@gmail.com';
  address = 'Av. Londes 489, Ica, Perú';
  hours = 'Lun - Vie: 9:00 - 18:00';
}
