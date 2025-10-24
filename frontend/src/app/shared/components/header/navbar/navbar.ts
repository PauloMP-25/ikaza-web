import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarLinksComponent } from './navbar-links/navbar-links';
import { NavbarAuthComponent } from './navbar-auth/navbar-auth';
import { NavbarCartComponent } from './navbar-cart/navbar-cart';
import { SearchService } from '@core/services/busqueda/search.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarLinksComponent,
    NavbarAuthComponent,
    NavbarCartComponent
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  public searchTerm: string = '';
  private currentRoute: string = '';
  private routerSubscription?: Subscription;

  // Rutas donde NO se debe mostrar la búsqueda y los links del catálogo
  private hiddenRoutes: string[] = [
    '/register',
    '/panel-admin',
  ];

  // Inyectamos el Router y nuestro SearchService.
  constructor(
    private router: Router,
    private searchService: SearchService
  ) { }

  ngOnInit() {
    // Obtener ruta inicial
    this.currentRoute = this.router.url;

    // Suscribirse a cambios de ruta
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Determina si se deben mostrar la búsqueda y los links del catálogo
   */
  shouldShowSearchAndLinks(): boolean {
    // Si está en una ruta oculta, no mostrar
    const isHiddenRoute = this.hiddenRoutes.some(route =>
      this.currentRoute.startsWith(route)
    );

    return !isHiddenRoute;
  }

  /**
   * Se ejecuta cuando el usuario envía el formulario de búsqueda (Enter o clic).
   */
  public onSearchSubmit(): void {
    // Actualizamos el término en el servicio.
    this.searchService.updateSearchTerm(this.searchTerm);
    // Navegamos a la página de resultados con el término como parámetro de consulta.
    this.router.navigate(['/search'], { queryParams: { q: this.searchTerm } });
  }
}



