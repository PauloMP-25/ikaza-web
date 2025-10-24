import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from '@core/models/productos/producto-backend.model';
import { ProductUtilsService } from '@core/services/productos/product-utils.service';

@Component({
  selector: 'app-custom-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-carrousel.html',
  styleUrl: './custom-carrousel.scss'
})
export class CustomCarouselComponent implements OnInit, OnDestroy {
  @Input() products: Producto[] = [];
  @Input() itemsPerSlide: number = 4;
  @Input() buttonText: string = 'Agregar al Carrito';
  @Input() showNewBadge: boolean = false;
  @Input() showStock: boolean = false;
  @Input() autoPlayInterval: number = 0; // 0 = desactivado

  @Input() onAddToCart: any;
  @Input() onImageClick: any;

  productChunks: Producto[][] = [];
  currentIndex: number = 0;
  private autoPlayTimer: any = null;
  constructor(){
    productUtils: ProductUtilsService;
  }

  ngOnInit() {
    this.createChunks();
    if (this.autoPlayInterval > 0) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  private createChunks() {
    this.productChunks = [];
    for (let i = 0; i < this.products.length; i += this.itemsPerSlide) {
      this.productChunks.push(this.products.slice(i, i +
        this.itemsPerSlide));
    }
  } next() {
    if (this.currentIndex < this.productChunks.length - 1) {
      this.currentIndex++;
      this.resetAutoPlay();
    }
  } prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.resetAutoPlay();
    }
  }

  goToSlide(index: number) {
    this.currentIndex = index;
    this.resetAutoPlay();
  }

  private startAutoPlay() {
    this.autoPlayTimer = setInterval(() => {
      if (this.currentIndex < this.productChunks.length - 1) { this.currentIndex++; } else { this.currentIndex = 0; }
    },
      this.autoPlayInterval);
  } private stopAutoPlay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  } private resetAutoPlay() {
    if (this.autoPlayInterval > 0) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

}
