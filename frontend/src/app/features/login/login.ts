import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalService } from '@core/services/auth/modal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})

export class LoginComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);

  ngOnInit(): void {
    // Suscribirse a los query parameters para obtener datos del Guard
    this.route.queryParams.subscribe(params => {
      const returnUrl = params['returnUrl'] || '';
      const infoMessage = params['message'] || '';
      const shouldDisplayModal = params['display'] === 'modal';

      // 🔑 Si el Guard nos envió a /login?display=modal, usamos el servicio
      if (shouldDisplayModal) {
        console.log("LoginComponent: Guard activó la apertura del modal.");
        this.modalService.openLoginModal(returnUrl, infoMessage);

        // 🚨 IMPORTANTE: Limpiar los query params inmediatamente
        // Si el usuario cierra el modal, no queremos que el URL siga siendo /login?display=modal
        this.router.navigate([], {
          queryParams: { display: null, returnUrl: null, message: null },
          queryParamsHandling: 'merge'
        });
      }

      // Si estamos en la ruta /login y NO hay instrucción de modal,
      // redirigir al home ya que el LoginComponent no tiene un template completo de login
      if (!shouldDisplayModal) {
        console.log("LoginComponent detecta navegación directa sin modal, redirigiendo a /");
        this.router.navigate(['/']);
      }
    });
  }
}