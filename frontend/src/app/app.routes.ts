/*
===========================================
Descripción general:
-------------------------------------------
Define las rutas principales de la aplicación Angular.
Incluye rutas públicas, protegidas (para usuario y administrador),
y componentes cargados de forma diferida (lazy loading) o dinámica (loadComponent).

Se utilizan diferentes guards para controlar el acceso según el tipo de usuario:
- AuthGuard → rutas para usuarios autenticados.
- NoAuthGuard → evita acceso al login si ya hay sesión iniciada.
- AdminGuard → protege las rutas del panel de administrador.
- checkoutGuard → asegura autenticación y carrito con productos antes del pago.
===========================================
*/

import { Routes } from '@angular/router';
// -----------------------------------
// Guardianes
// -----------------------------------
import { AuthGuard } from '@core/guards/auth.guard';
import { NoAuthGuard } from '@core/guards/noauth-guard';
import { AdminGuard } from '@core/guards/admin.guard';
import { checkoutGuard } from '@core/guards/checkout.guard';

export const routes: Routes = [
    // RUTA POR DEFECTO (404 y redirección)
    { path: '', redirectTo: 'home', pathMatch: 'full' },

    // RUTAS PÚBLICAS
    {
        path: 'home',
        loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
    },

    {
        path: 'producto/:id',
        loadComponent: () => import('./shared/components/producto/product-detalle/producto-detalle').then(m => m.ProductoDetalleComponent)
    },

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

    // Búsqueda de productos
    {
        path: 'search',
        loadComponent: () => import('@features/resultado-busqueda/search-results').then(m => m.SearchResultsComponent)
    },
    // RUTAS DE PAGOS (MERCADO PAGO)
    {
        path: 'pago-exito',
        loadComponent: () => import('@features/pagos/pago-exitoso/pago-exitoso').then(m => m.PagoExitoComponent)
    },
    {
        path: 'pago-error',
        loadComponent: () => import('@features/pagos/pago-error/pago-error').then(m => m.PagoErrorComponent)
    },
    {
        path: 'pago-pendiente',
        loadComponent: () => import('@features/pagos/pago-pendiente/pago-pendiente').then(m => m.PagoPendienteComponent)
    },
    // RUTAS DE USUARIO AUTENTICADO
    {
        path: 'panel-usuario',
        loadChildren: () => import('./features/panel-usuario/panel-usuario.routes').then(m => m.PANEL_USUARIO_ROUTES),
        canActivate: [AuthGuard]
    },
    // RUTAS DE ADMINISTRADOR
    {
        path: 'panel-administrador',
        loadChildren: () => import('./features/panel-administrador/panel-administrador.routes').then(m => m.PANEL_ADMIN_ROUTES),
        canActivate: [AdminGuard]
    },

    // PROCESO DE PAGO / CHECKOUT
    {
        path: 'carrito/pago',
        // Carga el componente que contendrá el modal o la lógica principal de checkout
        loadComponent: () => import('./shared/components/checkout/checkout').then(m => m.CheckoutComponent),
        canActivate: [checkoutGuard]
    },


    // RUTA DE LOGIN
    {
        path: 'login',
        canActivate: [NoAuthGuard],
        loadComponent: () => import('./features/login/login').then(m => m.LoginComponent)
    },
    // ----------------------------------------------------------------
    // RUTA WILDCARD
    // ----------------------------------------------------------------
    // Si la ruta no coincide con ninguna de las anteriores, redirige a 'home'.
    { path: '**', redirectTo: 'home' },
];