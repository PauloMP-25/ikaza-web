import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    // Subject para emitir eventos de apertura de modal
    private openLoginModalSource = new Subject<{ returnUrl?: string; infoMessage?: string }>();

    // Observable para que los componentes se suscriban
    loginModalOpen$ = this.openLoginModalSource.asObservable();

    /**
     * Solicita la apertura del modal de login.
     * @param returnUrl URL a la que redirigir tras el login.
     * @param infoMessage Mensaje informativo opcional.
     */
    openLoginModal(returnUrl: string = '', infoMessage: string = ''): void {
        // Emitir el evento con los datos necesarios
        this.openLoginModalSource.next({ returnUrl, infoMessage });
    }
}