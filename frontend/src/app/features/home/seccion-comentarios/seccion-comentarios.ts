import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Para [(ngModel)] si agregas form de nuevo comentario

// ← INTERFAZ: Sin cambios, está bien tipada
interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  date: Date;
  rating: number;
  comment: string;
  likes: number;
  dislikes: number;
  isLiked?: boolean;
  isDisliked?: boolean;
}

@Component({
  selector: 'app-seccion-comentarios',
  templateUrl: './seccion-comentarios.html',  // ← CORREGIDO: Usa .component.html (renombra si es necesario)
  styleUrls: ['./seccion-comentarios.scss'],
  standalone: true,
  imports: [
    CommonModule,    // Para *ngFor, *ngIf
    FormsModule      // Para [(ngModel)], <form>, (ngSubmit) – útil para form de nuevo comentario
  ]
})
export class SeccionComentariosComponent implements OnInit {

  // ← ARRAY: Sin cambios, hardcoded está bien (prepara para backend)
  comments: Comment[] = [
    {
      id: '1',
      userName: 'Sofía García',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3AcXHNv_goO1BuKSZE67kx0-GYxypklDdUpB0I44XJfg_1XkncfBlk-es-bK_z0yszbl49UuMEv0MChHa7893MAEXIIjn4pgWYgORkuLFIOvseWpESXGA3BUANlhWNIWyWyVCWDCISJsidpZzcgrvwV7F7Vt7RjFCwLXwWVwcRoICIEeBhzhA9eSK-eD6eoMvS4q2_ZR6tgoYDioNWGWMKZ83a3-FPEFum6dgr5B7cBz7V1JXaAick6HfDSoBHyZxiYEw0bJePbyD',
      date: new Date('2024-07-15'),
      rating: 5,
      comment: 'Me encanta la calidad de los productos y el excelente servicio al cliente. ¡Definitivamente volveré a comprar!',
      likes: 10,
      dislikes: 2,
      isLiked: false,
      isDisliked: false
    },
    {
      id: '2',
      userName: 'Carlos López',
      userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBm25jVzIopx3Q9oiS6iJWCHXWeAI-TaD86JEZJUPLQBW6Sr-9KzEBSj5vIi7lX-dJsTybXVzBRn3lJqcuFc-vV1-qoIx5GNM_369w90b5TfWj10MekG7wk9hD9F9Xu9HPGJW2qs0GSIERxVB3RuUNbh_xxWxwk43V-Hm30_vle40ykV1VG4BPPg3KSlLWd3GqbKYWJvGHXfJbCqCAW3xWlLKtUfZehfAeK3LbFiCbdVF6ItPl81BvxhsBY1ZNjcZ9mdTb-tWWmLn5O',
      date: new Date('2024-07-20'),
      rating: 4,
      comment: 'Los productos son buenos, pero el envío tardó un poco más de lo esperado. En general, una buena experiencia.',
      likes: 5,
      dislikes: 1,
      isLiked: false,
      isDisliked: false
    },
    {
      id: '3',
      userName: 'María Rodríguez',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1e7?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      date: new Date('2024-07-25'),
      rating: 5,
      comment: 'Excelente atención al cliente y productos de alta calidad. Los precios son muy competitivos.',
      likes: 8,
      dislikes: 0,
      isLiked: false,
      isDisliked: false
    },
    {
      id: '4',
      userName: 'Juan Pérez',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      date: new Date('2024-07-28'),
      rating: 4,
      comment: 'Buena variedad de productos. Me gustó especialmente la sección de tecnología.',
      likes: 6,
      dislikes: 1,
      isLiked: false,
      isDisliked: false
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Ordenar comentarios por fecha (más recientes primero) – sin cambios
    this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ← CORREGIDO: getStars con tipado explícito y guard para rating (evita error .map en strict mode)
  getStars(rating: number): boolean[] {
    // Guard: Clamp rating a 0-5 para evitar valores inválidos (e.g., NaN, >5)
    const safeRating = Math.max(0, Math.min(5, Math.floor(rating || 0)));
    
    // Usa Array.from para mejor inferencia de tipos (evita issues con Array(n).fill().map en strict TS)
    return Array.from({ length: 5 }, (_, i) => i < safeRating);
  }

  // ← MEJORADO: Guard extra para evitar NaN en promedio
  getAverageRating(): number {
    if (this.comments.length === 0) return 0;
    const sum = this.comments.reduce((acc, comment) => acc + (comment.rating || 0), 0);
    const average = sum / this.comments.length;
    return Math.round(average * 10) / 10;  // Redondea a 1 decimal
  }

  onLike(comment: Comment): void {
    if (comment.isLiked) {
      // Si ya está liked, quitar like
      comment.likes--;
      comment.isLiked = false;
    } else {
      // Si no está liked, agregar like
      comment.likes++;
      comment.isLiked = true;

      // Si estaba disliked, quitar dislike
      if (comment.isDisliked) {
        comment.dislikes--;
        comment.isDisliked = false;
      }
    }
  }

  onDislike(comment: Comment): void {
    if (comment.isDisliked) {
      // Si ya está disliked, quitar dislike
      comment.dislikes--;
      comment.isDisliked = false;
    } else {
      // Si no está disliked, agregar dislike
      comment.dislikes++;
      comment.isDisliked = true;

      // Si estaba liked, quitar like
      if (comment.isLiked) {
        comment.likes--;
        comment.isLiked = false;
      }
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
