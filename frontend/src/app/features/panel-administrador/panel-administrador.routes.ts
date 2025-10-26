import { Routes } from '@angular/router';

//IMPORTACIONES
import { BuzonVirtual } from './components/buzon-virtual/buzon-virtual';
import { Clientes } from './components/clientes/clientes';
import { Inventario } from './components/inventario/inventario';
import { Productos } from './components/productos/productos';
import { Reportes } from './components/reportes/reportes';
import { PanelAdministrador } from './panel-administrador';
import { ConfiguracionAdmin } from './components/configuracion-admin/configuracion-admin';

export const PANEL_ADMIN_ROUTES: Routes = [
    {
        path: '',  // Ruta base para el lazy-load
        component: PanelAdministrador,  // Carga el componente padre con side-nav y outlet
        children: [
            // Redirect por default:
            { path: '', redirectTo: 'reportes', pathMatch: 'full' },
            // Rutas hijas (coinciden con routerLink en side-nav)
            { path: 'lista-productos', component: Productos },
            {path: 'reportes', component: Reportes},
            { path: 'inventario', component: Inventario },
            { path: 'lista-clientes', component: Clientes }, 
            { path: 'buzon-virtual', component: BuzonVirtual },
            { path: 'configuracion', component: ConfiguracionAdmin},
            // Opcional: Ruta 404 para sub-rutas inválidas
            { path: '**', redirectTo: 'reportes' }
        ]
    }
];