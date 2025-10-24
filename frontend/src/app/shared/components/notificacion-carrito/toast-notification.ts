import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificacionService, Toast } from '@core/services/notificaciones/servicio-notificacion';

declare var bootstrap: any;

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-notification.html',
  styleUrl: './toast-notification.scss'
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  @ViewChild('toastElement') toastElement!: ElementRef;

  toast: Toast | null = null;
  private subscription!: Subscription;
  private toastInstance: any;

  constructor(private notificacionService: NotificacionService) { }

  ngOnInit(): void {
    this.subscription = this.notificacionService.toastState.subscribe(toast => {
      this.toast = toast;
      if (toast) {
        setTimeout(() => {
          if (this.toastElement) {
            this.toastInstance = new bootstrap.Toast(this.toastElement.nativeElement);
            this.toastInstance.show();
          }
        }, 0);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getTitle(type: 'success' | 'error' | 'info' | 'warning'): string {
    switch (type) {
      case 'success': return '¡Éxito!';
      case 'error': return 'Error';
      case 'info': return 'Información';
      case 'warning': return 'Peligro';
    }
  }
}