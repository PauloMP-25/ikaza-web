import { Component } from '@angular/core';

declare var bootstrap: any; 

@Component({
  selector: 'app-promociones',
  templateUrl: './promociones.html',
  styleUrls: ['./promociones.scss']
})
export class PromocionesComponent {
  selectedPhoto: string = '';

  fotosEventosPasados: string[] = [
    'assets/eventos/pasado1.jpg',
    'assets/eventos/pasado2.jpg',
    'assets/eventos/pasado3.jpg',
    'assets/eventos/pasado4.jpg'
  ];

  currentIndex: number = 0;

verFoto(foto: string) {
  this.currentIndex = this.fotosEventosPasados.indexOf(foto);
  this.selectedPhoto = foto;
  const modal = new bootstrap.Modal(document.getElementById('eventModal')!);
  modal.show();
}

cambiarFoto(direccion: number) {
  this.currentIndex = (this.currentIndex + direccion + this.fotosEventosPasados.length) 
                      % this.fotosEventosPasados.length;
  this.selectedPhoto = this.fotosEventosPasados[this.currentIndex];
}

  
}
