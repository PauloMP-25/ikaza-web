import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Importamos los componentes que hemos creado
import { HeaderComponent } from '@shared/components/header/header/header';
import { FooterComponent } from '@shared/components/footer/footer/footer';
import { ToastNotificationComponent } from '@shared/components/notificacion-carrito/toast-notification';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastNotificationComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('Ikaza-Web');
}
