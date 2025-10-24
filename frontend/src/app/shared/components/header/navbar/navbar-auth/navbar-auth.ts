import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { ModalLoginComponent } from '@features/login/modal_login/modal_login';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar-auth',
  standalone: true,
  imports: [CommonModule, RouterModule, ModalLoginComponent],
  templateUrl: './navbar-auth.html',
  styleUrls: ['./navbar-auth.scss']
})
export class NavbarAuthComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService); // Inyecta el servicio de forma moderna
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  currentUser = this.authService.getCurrentUser();
  any = null; // Puedes tipar según tu modelo


  // Variables para el avatar
  userAvatar: { type: 'image' | 'icon', value: string } = {
    type: 'icon',
    value: 'bi-person-circle'
  };
  displayName: string = '';
  //ABRIR O CERRAR EL MODAL
  isModalOpen = false;
  private userSubscription?: Subscription;

  ngOnInit() {
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.isAdmin = user?.isAdmin || false;
      this.loadUserAvatar();
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  loadUserAvatar() {
    const userData = this.currentUser;
    const firebaseUser = this.authService.getFirebaseCurrentUser();

    if (userData && firebaseUser) {
      this.displayName = userData.displayName || userData.username || (userData.email ? userData.email.split('@')[0] : '');

      if (firebaseUser.photoURL) {
        this.userAvatar = {
          type: 'image',
          value: firebaseUser.photoURL
        };
      } else if (userData.customIcon) {
        this.userAvatar = {
          type: 'icon',
          value: userData.customIcon
        };
      } else {
        this.userAvatar = {
          type: 'icon',
          value: 'bi-person-circle'
        };
      }
    } else {
      // Usuario no autenticado o sin datos
      this.displayName = '';
      this.userAvatar = {
        type: 'icon',
        value: 'bi-person-circle'
      };
    }
  }

  logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('Sesión cerrada exitosamente');
        },
        error: (error) => {
          console.error('Error al cerrar sesión:', error);
        }
      });
    }
  }

  // Getter para facilitar el acceso al usuario actual
  get isLoading() {
    return this.authService.isLoading();
  }
}

