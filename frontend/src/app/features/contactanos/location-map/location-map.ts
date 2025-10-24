import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-location-map',
  standalone: true,
  templateUrl: './location-map.html',
  styleUrls: ['./location-map.scss']
})
export class LocationMap{
  mapUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    const unsafeMapUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.0201201550976!2d-75.76020788485702!3d-14.075936389771508!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9110d29188048259%3A0x67e8913348689539!2sPlaza%20de%20Armas%20de%20Ica!5e0!3m2!1ses-419!2spe!4v1625442296541!5m2!1ses-419!2spe';
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeMapUrl);
  }
}