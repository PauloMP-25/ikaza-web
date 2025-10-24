import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer-links',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer-links.html',
  styleUrls: ['./footer-links.scss']
})
export class FooterLinksComponent {}
