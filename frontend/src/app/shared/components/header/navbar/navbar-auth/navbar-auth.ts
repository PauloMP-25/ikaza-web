import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth/auth';
import { ModalLoginComponent } from '@features/login/modal_login/modal_login';
import { ModalService } from '@core/services/auth/modal.service';
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
  private modalService = inject(ModalService);

  // Propiedades para pasar al modal (ahora vienen del servicio)
  returnUrl: string = '';
  infoMessage: string = '';
  isModalOpen = false; // ABRE Y CIERRA EL MODAL

  displayName: string = '';
  private userSubscription?: Subscription;
  private modalSubscription?: Subscription;

  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  currentUser = this.authService.getCurrentUser();
  any = null; // Puedes tipar según tu modelo


  // Variables para el avatar
  userAvatar: { type: 'image' | 'icon', value: string } = {
    type: 'icon',
    value: 'bi-person-circle'
  };

  ngOnInit() {
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.isAdmin = user?.isAdmin || false;
      this.loadUserAvatar();
    });
    // 🔑 Suscribirse al ModalService para abrir el modal
    this.modalSubscription = this.modalService.loginModalOpen$.subscribe(data => {
      this.returnUrl = data.returnUrl || '';
      this.infoMessage = data.infoMessage || '';
      this.isModalOpen = true; // 🚨 ¡Abrir el modal!
    });
  }

  // ⚠️ Cambiar la función openModal para usar el servicio
  openModal() {
    // Cuando el usuario presiona el botón "Ingresar", solicita la apertura.
    // No hay returnUrl ni message, es una apertura voluntaria.
    this.modalService.openLoginModal();
  }

  // 🔑 Manejador del evento 'close' y 'loginSuccess' del ModalLoginComponent.
  // Este es el único lugar donde el modal se cierra.
  onModalClose(wasLoginSuccess: boolean): void {
    // 1. Ocultar el modal inmediatamente.
    this.isModalOpen = false;
    // 2. Si el usuario canceló el modal (no hubo login exitoso),
    // y si estamos en la ruta /login (que es donde se activa el Guard)
    // es mejor redirigir al home o ruta segura.
    if (!wasLoginSuccess) {
      // Nota: Si el modal estaba abierto por el botón "Ingresar",
      // no necesitas redirigir, ya que la URL no ha cambiado.
      console.log('❌ Modal cancelado. Cerrado.');
    }
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.modalSubscription?.unsubscribe(); // 🔑 Desuscribirse del modal
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

