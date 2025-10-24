// src/app/components/product-detail/product-gallery/product-gallery.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.scss'
})
export class ProductGalleryComponent {
  @Input() images: string[] = [];
  @Input() productName: string = '';

  selectedImage: string = '';

  ngOnInit() {
    this.selectedImage = this.images[0];
  }

  selectImage(image: string) {
    this.selectedImage = image;
  }
}