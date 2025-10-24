import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SideNavAdminComponent } from './components/side-nav-admin/side-nav';

@Component({
  selector: 'app-panel-administrador',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SideNavAdminComponent], // <-- Importa aquí
  templateUrl: './panel-administrador.html',
  styleUrl: './panel-administrador.scss'
})
export class PanelAdministrador {

}
