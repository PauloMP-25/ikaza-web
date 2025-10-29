// src/app/shared/components/navbar-auth/navbar-auth.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, tap } from 'rxjs';

import { AuthService } from '@core/services/auth/auth';
import { ModalLoginComponent } from '@features/login/modal_login/modal_login';
import { UserData } from '@core/models/auth/auth.models';

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
  // SUBJECT PARA LIMPIAR SUBSCRIPTIONS
  // ============================================================================
  private destroy$ = new Subject<void>();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
    this.initializeUserSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  /**
   * Suscripción al usuario (REACTIVO)
   */
  private initializeUserSubscription(): void {
    this.authService.user$.pipe(
      takeUntil(this.destroy$),
      tap(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
        this.isAdmin = user?.isAdmin || false;
        this.loadUserAvatar(user);
      })
    ).subscribe();
  }

  /**
   * Cargar avatar del usuario
   */
  private loadUserAvatar(user: UserData | null): void {
    if (!user) {
      this.displayName = '';
      this.userAvatar = {
        type: 'icon',
        value: 'bi-person-circle'
      };
      return;
    }

    // Determinar displayName del email
    this.displayName = user.email.split('@')[0];

    // Determinar avatar
    if (user.photoURL) {
      this.userAvatar = {
        type: 'image',
        value: user.photoURL
      };
    } else if (user.customIcon) {
      this.userAvatar = {
        type: 'icon',
        value: user.customIcon
      };
    } else {
      this.userAvatar = {
        type: 'icon',
        value: 'bi-person-circle'
      };
    }
  }

  // ============================================================================
  // MANEJO DEL MODAL
  // ============================================================================

  /**
   * Abrir modal de login
   */
  openModal(): void {
    console.log('📋 Abriendo modal de login');
    this.isModalOpen = true;
  }

  /**
   * Cerrar modal
   */
  onModalClose(): void {
    console.log('❌ Cerrando modal');
    this.isModalOpen = false;
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

    console.log('🔄 Iniciando logout...');

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Logout exitoso');
        },
        error: (error) => {
          console.error('❌ Error en logout:', error);
        }
      });
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get isLoading(): boolean {
    return this.authService.isLoading();
  }

  get userInitials(): string {
    if (!this.displayName) return '';
    return this.displayName.substring(0, 2).toUpperCase();
  }
}

