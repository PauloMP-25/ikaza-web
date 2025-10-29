import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, tap } from 'rxjs';

import { AuthService } from '@core/services/auth/auth';
import { ModalLoginComponent } from '@features/login/modal_login/modal_login';
import { ModalService } from '@core/services/auth/modal.service';
import { UserData } from '@core/models/auth-firebase/user-data';

@Component({
  selector: 'app-navbar-auth',
  standalone: true,
  imports: [CommonModule, RouterModule, ModalLoginComponent],
  templateUrl: './navbar-auth.html',
  styleUrls: ['./navbar-auth.scss']
})
export class NavbarAuthComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INYECCIÓN DE DEPENDENCIAS
  // ============================================================================
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  // ============================================================================
  // ESTADO DEL MODAL
  // ============================================================================
  isModalOpen = false;
  returnUrl: string = '';
  infoMessage: string = '';

  // ============================================================================
  // ESTADO DEL USUARIO
  // ============================================================================
  currentUser: UserData | null = null;
  isAuthenticated: boolean = false;
  isAdmin: boolean = false;
  displayName: string = '';

  // ============================================================================
  // ESTADO DEL AVATAR
  // ============================================================================
  userAvatar: { type: 'image' | 'icon', value: string } = {
    type: 'icon',
    value: 'bi-person-circle'
  };

  // ============================================================================
  // 🆕 SUBJECT PARA LIMPIAR SUBSCRIPTIONS
  // ============================================================================
  private destroy$ = new Subject<void>();


  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.initializeUserSubscription();
    this.initializeModalSubscription();
  }

  /**
   * 🆕 Limpiar subscriptions al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // 🆕 INICIALIZACIÓN - VERSIÓN REACTIVA
  // ============================================================================

  /**
   *  Suscripción al usuario (REACTIVO)
   */
  private initializeUserSubscription(): void {
    this.authService.user$.pipe(
      takeUntil(this.destroy$),
      tap(user => {
        // Actualizar estado del usuario
        this.currentUser = user;
        this.isAuthenticated = !!user;
        this.isAdmin = user?.isAdmin || false;

        // Cargar avatar directamente en el mismo flujo
        this.loadUserAvatar(user);
      })
    ).subscribe();
  }

  /**
   * Suscripción al servicio del modal
   * - Escucha cuando otros componentes/guards solicitan abrir el modal
   * - Usa takeUntil() para limpieza automática
   */
  private initializeModalSubscription(): void {
    this.modalService.loginModalOpen$.pipe(
      takeUntil(this.destroy$),
      tap(data => {
        this.returnUrl = data.returnUrl || '';
        this.infoMessage = data.infoMessage || '';
        this.isModalOpen = true;
        console.log('🔓 Modal de login abierto:', { returnUrl: this.returnUrl, message: this.infoMessage });
      })
    ).subscribe();
  }

  // ============================================================================
  // 🆕 CARGA DEL AVATAR - VERSIÓN REACTIVA
  // ============================================================================

  /**
  * Cargar avatar del usuario (REACTIVO)
  */
  private loadUserAvatar(user: UserData | null): void {
    if (!user) {
      // Usuario no autenticado
      this.displayName = '';
      this.userAvatar = {
        type: 'icon',
        value: 'bi-person-circle'
      };
      return;
    }

    // Determinar displayName
    this.displayName = user.displayName ||
      user.username ||
      (user.email ? user.email.split('@')[0] : '');

    // Determinar avatar (imagen o icono)
    if (user.photoURL) {
      // Usuario tiene foto de perfil
      this.userAvatar = {
        type: 'image',
        value: user.photoURL
      };
    } else if (user.customIcon) {
      // Usuario tiene icono personalizado
      this.userAvatar = {
        type: 'icon',
        value: user.customIcon
      };
    } else {
      // Avatar por defecto
      this.userAvatar = {
        type: 'icon',
        value: 'bi-person-circle'
      };
    }

    console.log('Avatar cargado:', this.userAvatar);
  }

  // ============================================================================
  // MANEJO DEL MODAL
  // ============================================================================

  /**
   * Abrir modal de login (cuando el usuario hace clic en "Ingresar")
   */
  openModal(): void {
    console.log('Abriendo modal de login (usuario hizo clic en "Ingresar")');
    this.modalService.openLoginModal();
  }

  /**
   * Manejar cierre del modal
   * 
   * @param wasLoginSuccess - true si el login fue exitoso, false si se canceló
   */
  onModalClose(wasLoginSuccess: boolean): void {
    console.log('Cerrando modal:', wasLoginSuccess ? 'Login exitoso' : 'Cancelado');

    // Cerrar el modal
    this.isModalOpen = false;

    if (!wasLoginSuccess) {
      console.log('Modal cancelado sin login exitoso');
      // Opcional: Lógica adicional si el usuario cancela
    } else {
      console.log('Login exitoso, modal cerrado');
      // El AuthService ya maneja la redirección
    }
  }

  // ============================================================================
  // LOGOUT
  // ============================================================================

  /**
   * Cerrar sesión
   */
  logout(): void {
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      return;
    }

    this.authService.logout()
      .pipe(
        takeUntil(this.destroy$) //Limpieza automática
      )
      .subscribe({
        next: () => {
          console.log('Sesión cerrada exitosamente');
        },
        error: (error) => {
          console.error('Error al cerrar sesión:', error);
          alert('Ocurrió un error al cerrar sesión. Por favor intenta nuevamente.');
        }
      });
  }

  // ============================================================================
  // GETTERS PARA EL TEMPLATE
  // ============================================================================

  /**
   * Verificar si el servicio de autenticación está cargando
   */
  get isLoading(): boolean {
    return this.authService.isLoading();
  }

  /**
   * Obtener iniciales del usuario para avatar fallback
   * (útil si quieres mostrar iniciales en lugar de un icono)
   */
  get userInitials(): string {
    if (!this.displayName) return '';

    const names = this.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return this.displayName.substring(0, 2).toUpperCase();
  }
}

