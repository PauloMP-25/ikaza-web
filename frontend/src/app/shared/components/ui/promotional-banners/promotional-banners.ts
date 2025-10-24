import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Tipos de enlace para los banners
export type BannerLinkType = 'external' | 'internal' | 'section' | 'none';

export interface PromotionalBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  linkType: BannerLinkType; // Tipo de enlace
  backgroundColor: string;
  textColor: string;
  buttonText: string; // Texto personalizable del botón
  isActive: boolean;
}

@Component({
  selector: 'app-banners-promocional',
  templateUrl: './promotional-banners.html',
  styleUrls: ['./promotional-banners.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class BannersPromocionalComponent implements OnInit {

  banners: PromotionalBanner[] = [
    {
      id: '1',
      title: 'Síguenos en TikTok',
      description: 'Descubre contenido exclusivo y ofertas sorpresa',
      imageUrl: 'assets/banners/canal-tiktok.jpg',
      linkUrl: 'https://www.tiktok.com/@ikazaimport',
      linkType: 'external',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      buttonText: 'Ver TikTok',
      isActive: true
    },
    {
      id: '2',
      title: 'Suscríbete en YouTube',
      description: 'Tutoriales, reviews y mucho más',
      imageUrl: 'assets/banners/canal-youtube.jpg',
      linkUrl: 'https://www.youtube.com/@tucanal',
      linkType: 'external',
      backgroundColor: '#FF0000',
      textColor: '#ffffff',
      buttonText: 'Ver Canal',
      isActive: true
    },
    {
      id: '3',
      title: 'Síguenos en Facebook',
      description: 'Únete a nuestra comunidad',
      imageUrl: 'assets/banners/canal-facebook.png',
      linkUrl: 'https://www.facebook.com/profile.php/?id=61552746324574',
      linkType: 'external',
      backgroundColor: '#1877F2',
      textColor: '#ffffff',
      buttonText: 'Visitar Página',
      isActive: true
    },
    {
      id: '4',
      title: 'Ofertas de Temporada',
      description: 'Hasta 50% de descuento en productos seleccionados',
      imageUrl: 'assets/banners/ofertas-verano.jpg',
      linkUrl: '/ofertas',
      linkType: 'internal',
      backgroundColor: '#ffc107',
      textColor: '#212529',
      buttonText: 'Ver Ofertas',
      isActive: true
    },
    {
      id: '5',
      title: 'Nueva Colección',
      description: 'Descubre los últimos productos de temporada',
      imageUrl: 'assets/banners/nueva-coleccion.jpg',
      linkUrl: 'nuevos-productos',
      linkType: 'section',
      backgroundColor: '#6f42c1',
      textColor: '#ffffff',
      buttonText: 'Explorar',
      isActive: true
    }
  ];

  activeBanners: PromotionalBanner[] = [];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.activeBanners = this.banners.filter(banner => banner.isActive);
  }

  onBannerClick(banner: PromotionalBanner): void {
    if (!banner.linkUrl) {
      console.log('Banner sin URL configurada:', banner.title);
      return;
    }

    switch (banner.linkType) {
      case 'external':
        // Abre enlaces externos en nueva pestaña
        window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
        break;

      case 'internal':
        // Navega a rutas internas de la app
        this.router.navigate([banner.linkUrl]);
        break;

      case 'section':
        // Scroll a sección específica de la página
        this.scrollToSection(banner.linkUrl);
        break;

      case 'none':
        // No hace nada (banner informativo)
        console.log('Banner informativo:', banner.title);
        break;

      default:
        console.warn('Tipo de enlace no reconocido:', banner.linkType);
    }
  }

  private scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      console.warn(`Sección no encontrada: ${sectionId}`);
    }
  }
}