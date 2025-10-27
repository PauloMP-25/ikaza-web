//COMPONENTES GENERALES DE ANGULAR
import { Routes } from 'node_modules/@angular/router/router_module.d';
import { AuthGuard } from '@core/guards/auth-guard';
import { NoAuthGuard } from '@core/guards/noauth-guard';
import { AdminGuard } from '@core/guards/admin-guard';
import { checkoutGuard } from '@core/guards/checkout.guard';

//PRUEBA MERCADO PAGO
import { PagoExitoComponent } from '@features/pagos/pago-exitoso/pago-exitoso';
import { PagoErrorComponent } from '@features/pagos/pago-error/pago-error';
import { PagoPendienteComponent } from '@features/pagos/pago-pendiente/pago-pendiente';
import { SearchResultsComponent } from '@features/resultado-busqueda/search-results';
import { HomeComponent } from './features/home/home';
import { ProductosListaComponent } from '@shared/components/productoSpringBoot/productosSpring';

export const routes: Routes = [
    // Rutas públicas
    { path: 'home', component: HomeComponent },
    {
        path: 'home',
        loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
    },

    {
        path: 'producto/:id',
        loadComponent: () => import('./shared/components/producto/product-detalle/producto-detalle').then(m => m.ProductoDetalleComponent)
    },


    // ----------------------------------- PRUEBA
    { path: 's2', component: ProductosListaComponent },

    // Busqueda
    { path: 'search', component: SearchResultsComponent },

    // Catálogo y páginas informativas
    {
        path: 'catalogo',
        loadComponent: () => import('./features/catalogo/catalogo').then(m => m.CatalogoComponent)
    },
    {
        path: 'nosotros',
        loadComponent: () => import('./features/nosotros/nosotros/nosotros').then(m => m.NosotrosComponent)
    },
    {
        path: 'contactanos',
        loadComponent: () => import('./features/contactanos/contactanos/contactanos').then(m => m.ContactanosComponent)
    },
    // OTRAS RUTAS
    { path: 'pago-exito', component: PagoExitoComponent },
    { path: 'pago-error', component: PagoErrorComponent },
    { path: 'pago-pendiente', component: PagoPendienteComponent },

    //RUTAS PARA USUARIO-LOGUEADO
    {
        path: 'panel-usuario',
        loadChildren: () => import('./features/panel-usuario/panel-usuario.routes').then(m => m.PANEL_USUARIO_ROUTES),
        canActivate: [AuthGuard]
    },
    {
        path: 'panel-administrador',
        loadChildren: () => import('./features/panel-administrador/panel-administrador.routes').then(m => m.PANEL_ADMIN_ROUTES),
        canActivate: [AdminGuard]
    },

    // Ruta de pago protegida (usa el guard que verifica carrito y autenticación)
    {
        path: 'carrito/pago',
        // Carga el componente que contendrá el modal o la lógica principal de checkout
        loadComponent: () => import('./shared/components/checkout/checkout').then(m => m.CheckoutComponent),
        canActivate: [checkoutGuard] 
    },

    // Ruta de login (no accesible si ya está logueado)
    {
        path: 'login',
        canActivate: [NoAuthGuard],
        loadComponent: () => import('./features/login/login').then(m => m.LoginComponent)
    },
    {
        path: '**',
        redirectTo: 'home'
    }
];