import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // Importa RouterModule para routerLink

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss'
})
export class SideNavAdminComponent {
  constructor(private router: Router) { }

  cerrarSesion() {
    alert('Sesión cerrada');
    // Aquí iría la lógica para limpiar el token/sesión
    this.router.navigate(['/index']); // Navega a la página principal
  }
}
