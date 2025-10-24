import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterBrandComponent } from '../footer-brand/footer-brand';
import { FooterLinksComponent } from '../footer-links/footer-links';
import { FooterSocialComponent } from '../footer-social/footer-social';
import { FooterContactComponent } from '../footer-contact/footer-contact';
import { FooterCopyrightComponent } from '../footer-copyright/footer-copyright';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    FooterBrandComponent, FooterLinksComponent, FooterSocialComponent, FooterContactComponent, FooterCopyrightComponent
  ],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss']
})
export class FooterComponent { }
