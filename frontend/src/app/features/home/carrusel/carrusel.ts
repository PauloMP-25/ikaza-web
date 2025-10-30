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
    { id: 1, nombre: 'Utensilios', imagen: 'assets/banners/tiktok.png' },
    { id: 2, nombre: 'Juguetes', imagen: 'assets/banners/tiktok.png' },
    { id: 3, nombre: 'Ropa', imagen: 'assets/banners/tiktok.png' },
    { id: 4, nombre: 'Decoración', imagen: 'assets/banners/tiktok.png' },
    { id: 5, nombre: 'Electrónica', imagen: 'assets/banners/tiktok.png' },
    { id: 6, nombre: 'Cocina', imagen: 'assets/banners/tiktok.png' },
    { id: 7, nombre: 'Mascotas', imagen: 'assets/banners/tiktok.png' }
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


