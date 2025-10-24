import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SideNavUserComponent } from './components/side-nav-user-desk/side-nav';

@Component({
  selector: 'app-panel-usuario',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SideNavUserComponent],
  templateUrl: './panel-usuario.html',
  styleUrls: ['./panel-usuario.scss']
})
export class PanelUsuarioComponent {

}
