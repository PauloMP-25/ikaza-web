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
      userAvatar: 'https://scontent.flim2-2.fna.fbcdn.net/v/t39.30808-6/481470013_1733821227477412_4809371446473984969_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=VsERlR-sh0QQ7kNvwF7mNLl&_nc_oc=AdkjdZYNYI95NEM0os0k5AAFyBgu99G2fCyQZB6jiH7gAvH9ULngKpCh6qJ6AYr25fU&_nc_zt=23&_nc_ht=scontent.flim2-2.fna&_nc_gid=hvFbXbCJCk_yk8DU2Kx5Ig&oh=00_Afcd7NhXgWmxIS5qchp1F8mMbYPd_A4PpjIfZSAPOfqrpQ&oe=69097F8D',
      date: new Date('2025-07-15'),
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
      userAvatar: 'https://scontent.flim20-1.fna.fbcdn.net/v/t1.6435-9/79385655_107104440771919_4334156673552744448_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=tAeLkSjqFdwQ7kNvwG0Le8a&_nc_oc=AdldcLcdFzqu0cqjBT3_ZOzzn5BdKdfiefpntP35zcq8WWVTiW-BGqtTJY0XhMUAbDM&_nc_zt=23&_nc_ht=scontent.flim20-1.fna&_nc_gid=feXSYN2e93htKTISG8fyTg&oh=00_AffIaDcHsnQ-vXkzDEaOL53RPaax8nhb6CAgLpWdAHQXSA&oe=692B32D7',
      date: new Date('2025-07-20'),
      rating: 4,
      comment: 'Los productos son buenos, pero el envío tardó un poco más de lo esperado. En general, una buena experiencia.',
      likes: 5,
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
