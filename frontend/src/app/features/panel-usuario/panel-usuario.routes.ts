import { Routes } from '@angular/router';

// IMPORTACIONES
import { PanelUsuarioComponent } from './panel-usuario';
import { DatosPersonalesComponent } from './components/datos-personales/datos-personales';
import { DireccionesComponent } from './components/direcciones/direcciones';
import { MediosPagoComponent } from './components/medios-pago/medios-pago';
import { ReembolsoComponent } from './components/reembolso/reembolso';
import { ConfiguracionComponent } from './components/configuracion/configuracion';
import { HistorialComprasComponent } from './components/historial-compras/historial-compras';
import { BuzonVirtual } from './components/buzon-virtual/buzon-virtual';
import { PromocionesComponent } from './components/promociones/promociones';

export const PANEL_USUARIO_ROUTES: Routes = [
    {
        path: '',  // Ruta base para el lazy-load
        component: PanelUsuarioComponent,  // Carga el componente padre con side-nav y outlet
        children: [
            // Redirect por default
            { path: '', redirectTo: 'promociones', pathMatch: 'full' },
            // Rutas hijas (coinciden con routerLink en side-nav)
            { path: 'datos-personales', component: DatosPersonalesComponent }, 
            { path: 'direcciones', component: DireccionesComponent },
            { path: 'historial-compras', component: HistorialComprasComponent },
            { path: 'medios-pago', component: MediosPagoComponent },
            { path: 'reembolso', component: ReembolsoComponent },
            { path: 'promociones', component: PromocionesComponent },
            { path: 'buzon-virtual', component: BuzonVirtual },
            { path: 'configuracion', component: ConfiguracionComponent },
            // Opcional: Ruta 404 para sub-rutas inválidas
            { path: '**', redirectTo: 'datos-personales' }
        ]
    }
];