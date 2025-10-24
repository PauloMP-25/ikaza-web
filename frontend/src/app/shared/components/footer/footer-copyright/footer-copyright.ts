import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-copyright',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer-copyright.html',
  styleUrls: ['./footer-copyright.scss']
})
export class FooterCopyrightComponent {
  year = new Date().getFullYear();
  company = 'Ikaza';
}

