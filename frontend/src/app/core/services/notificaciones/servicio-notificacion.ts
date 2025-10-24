import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private toastSubject = new BehaviorSubject<Toast | null>(null);
  public toastState = this.toastSubject.asObservable(); // Componente se suscribe aquí


  showToast(message: string | Toast, type: 'success' | 'error' | 'info' | 'warning' = 'success', duration: number = 3000) {
    let toast: Toast;

    // Permite que la función reciba el objeto Toast completo o los parámetros separados
    if (typeof message === 'string') {
      toast = { message, type, duration };
    } else {
      toast = message;
    }

    this.toastSubject.next(toast);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.hide();
      }, toast.duration);
    }
  }

  hide() {
    this.toastSubject.next(null);
  }
}