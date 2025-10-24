// src/app/features/login/login.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
// ⚠️ Importa el ModalLoginComponent
import { ModalLoginComponent } from './modal_login/modal_login';
@Component({
  selector: 'app-login',
  standalone: true,
  // Solo necesitamos CommonModule y el ModalLoginComponent
  imports: [CommonModule, ModalLoginComponent],
  // El template/style no son necesarios si solo renderiza el modal, pero los mantenemos para Angular
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})

export class LoginComponent implements OnInit {
  // Inyecciones: Router para la navegación, ActivatedRoute para los query params
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // 🔑 Propiedades de estado para controlar el modal y pasar datos
  showModal = false;
  returnUrl = '';
  infoMessage = '';

  ngOnInit(): void {
    // Suscribirse a los query parameters para obtener datos del Guard
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '';
      this.infoMessage = params['message'] || '';

      // Activar el modal si el Guard envió 'display: modal'
      this.showModal = params['display'] === 'modal';

      // Si estamos en la ruta /login y NO hay instrucción de modal,
      // podemos asumir que el usuario llegó a la página de login
      // por lo que no tiene sentido dejarlo vacío.
      if (!this.showModal) {
        // Aquí podrías redirigir al home o renderizar una vista de login de página completa
        // Si no hay vista de página, es mejor redirigir:
        // console.log("LoginComponent detecta navegación directa, redirigiendo a /");
        // this.router.navigate(['/']);
      }
    });
  }

  /**
     * Manejador del evento 'close' y 'loginSuccess' del ModalLoginComponent.
     * @param wasLoginSuccess Indica si el cierre se debe a un login exitoso.
     */
  onModalClose(wasLoginSuccess: boolean): void {
    // 1. Ocultar el modal inmediatamente.
    this.showModal = false;
    // 2. Si el login fue exitoso, el ModalLoginComponent ya manejó la redirección

    // 3. Si no fue por login exitoso (es decir, el usuario canceló el modal),
    //lo sacamos de la ruta '/auth/login' (asumiendo que /auth/login es la ruta vacía).
    if (!wasLoginSuccess) {
      console.log('❌ Modal cancelado. Redirigiendo a /home o ruta segura.');
      this.router.navigate(['/']); // Redirige al home o a una ruta neutra
    }
  }
}