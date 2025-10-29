import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoDetalle } from '@core/models/productos/producto-backend.model';

declare var bootstrap: any;

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail-modal.html',
  styleUrls: ['./product-detail-modal.scss']
})
export class ProductDetailModalComponent implements OnChanges, OnDestroy {

  @Input() product?: ProductoDetalle;
  @Input() showModal: boolean = false;

  private modalInstance: any = null;
  private modalElement: HTMLElement | null = null;

  selectedImageIndex: number = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showModal'] && this.showModal) {
      this.openModal();
    } else if (changes['showModal'] && this.showModal === false) {
      this.closeModal();
    }

    if (changes['product'] && this.product) {
      this.selectedImageIndex = 0;
    }
  }

  ngOnDestroy() {
    this.closeModal();
  }

  // Obtener imágenes correctas según tu modelo
  get productImages(): string[] {
    if (!this.product) return [];

    const images: string[] = [];

    if (this.product.imagenPrincipal) {
      images.push(this.product.imagenPrincipal);
    }

    if (!!this.product.imagenes?.length) {
      images.push(...this.product.imagenes.map((img) => img.url));
    }

    return images;
  }

  selectImage(index: number) {
    this.selectedImageIndex = index;
  }

  openModal() {
    if (!this.modalElement) {
      this.modalElement = document.getElementById('detalleModal');
    }

    if (this.modalElement && bootstrap) {
      if (this.modalInstance) this.modalInstance.dispose();

      this.modalInstance = new bootstrap.Modal(this.modalElement, {
        backdrop: true,
        keyboard: true
      });

      this.modalElement.addEventListener('hidden.bs.modal', this.onModalHidden.bind(this));
      this.modalInstance.show();
    }
  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  private onModalHidden() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());

    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    if (this.modalInstance) {
      this.modalInstance.dispose();
      this.modalInstance = null;
    }
  }
}

