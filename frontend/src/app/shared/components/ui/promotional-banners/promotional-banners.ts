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
    title: 'Novedades y mucho más!', 
    description: 'Únete a nuestra comunidad y mantente al día con los nuevos productos. ¡Sé parte de Ikaza Import!',
    imageUrl: 'assets/banners/banner-principal.png',
    linkUrl: 'https://chat.whatsapp.com/FnNKHZOGiVc7I4opDtcxce',
    linkType: 'external',
    backgroundColor: '#25D366', 
    textColor: '#ffffff', 
    buttonText: 'Unirme al Grupo',
    isActive: true
  },
  {
    id: '2',
    title: 'Síguenos en Facebook',
    description: 'Únete a nuestra comunidad y sé el primero en conocer las novedades.',
    imageUrl: 'assets/banners/bannerFB.jpg',
    linkUrl: 'https://www.facebook.com/profile.php/?id=61552746324574',
    linkType: 'external',
    backgroundColor: '#1877F2', 
    textColor: '#ffffff', 
    buttonText: 'Visitar Página', 
    isActive: true
  },
  {
    id: '3',
    title: '¡Súmate a la tendencia en TikTok!',
    description: 'Tutoriales, reviews rápidos y divertidos. No te pierdas nuestros videos más virales.',
    imageUrl: 'assets/banners/tiktok.png',
    linkUrl: 'https://www.tiktok.com/@ikaza.import',
    linkType: 'external',
    backgroundColor: '#2b2b2ba9', 
    textColor: '#ffffffff', 
    buttonText: 'Ver TikTok', 
    isActive: true
  },
  {
    id: '4',
    title: '¡Ofertas de Temporada!',
    description: 'Hasta 50% de descuento en productos seleccionados. ¡Aprovecha antes que se acaben!',
    imageUrl: 'assets/banners/halloween.jpg',
    linkUrl: '/ofertas',
    linkType: 'internal',
    backgroundColor: '#FF6600', 
    textColor: '#ffffff',
    buttonText: 'Ver Ofertas',
    isActive: true
  },
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