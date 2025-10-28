import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SearchService } from '@core/services/busqueda/search.service';
import { NavbarLinksComponent } from "../navbar/navbar-links/navbar-links";


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarLinksComponent],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent implements OnInit {

  public searchTerm: string = ''; // 🆕 Estado para el input
  private router = inject(Router); // Inyectamos Router de forma moderna
  private searchService = inject(SearchService); // Inyectamos SearchService
  private searchSubscription?: Subscription;


  ngOnInit() {
    this.searchSubscription = this.searchService.currentSearchTerm.subscribe((term: string) => {
      this.searchTerm = term;
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  /**
   * 🆕 Gestiona la búsqueda
   */
  public onSearchSubmit(): void {
    if (this.searchTerm.trim()) {
      // 1. Actualizamos el término en el servicio.
      this.searchService.updateSearchTerm(this.searchTerm);

      // 2. Navegamos a la página de resultados.
      this.router.navigate(['/search'], { queryParams: { q: this.searchTerm } });

      // 3. Opcional: Cerrar el offcanvas después de buscar (depende de Bootstrap JS)
      this.closeSidebar();
    }
  }

  /**
   * 🆕 Helper para cerrar el offcanvas después de una acción
   */
  private closeSidebar() {
    const offcanvasElement = document.getElementById('sidebarMenu');
    if (offcanvasElement && (window as any).bootstrap) {
      const offcanvas = (window as any).bootstrap.Offcanvas.getInstance(offcanvasElement);
      if (offcanvas) {
        offcanvas.hide();
      }
    }
  }
}
