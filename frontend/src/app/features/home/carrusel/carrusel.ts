import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-carrusel',
  imports: [CommonModule],
  templateUrl: './carrusel.html',
  styleUrl: './carrusel.scss'
})

export class Carrusel implements OnInit {

  categorias = [
    { id: 1,  imagen: 'assets/banners/categoria/cocina.jpg' },
    { id: 2,  imagen: 'assets/banners/categoria/herramienta.jpg' },
    { id: 3,  imagen: 'assets/banners/categoria/fiesta.jpg' },
    { id: 4,  imagen: 'assets/banners/categoria/utiles.jpg' },
    { id: 5,  imagen: 'assets/banners/categoria/hogar.jpg' },
    { id: 6,  imagen: 'assets/banners/categoria/niños.jpg' },
    { id: 7,  imagen: 'assets/banners/categoria/tecnologia.jpg' },
    { id: 8,  imagen: 'assets/banners/categoria/moda.jpg' },
    { id: 9,  imagen: 'assets/banners/categoria/abrigo.jpg' }
  ];

  categoriaGrupos: any[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.organizarCategorias();
  }

  organizarCategorias() {
    const grupoTam = 3;
    for (let i = 0; i < this.categorias.length; i += grupoTam) {
      this.categoriaGrupos.push(this.categorias.slice(i, i + grupoTam));
    }
  }

  onCategoriaClick(id: number) {
    console.log('Categoría seleccionada:', id);
     this.router.navigate(['/catalogo'], { queryParams: { id } });

  }

}


