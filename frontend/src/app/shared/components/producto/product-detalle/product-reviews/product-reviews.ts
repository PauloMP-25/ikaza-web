// src/app/components/product-detail/product-reviews/product-reviews.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: Date;
}

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.scss'
})
export class ProductReviewsComponent {
  @Input() reviews: Review[] = [];
  @Input() averageRating: number = 0;

  reviewsPerPage = 5;
  currentPage = 1;
  paginatedReviews: Review[] = [];
  totalPages = 1;

  ngOnChanges() {
    this.updatePagination();
  }

  getRatingPercentage(rating: number): number {
    if (this.reviews.length === 0) return 0;
    const count = this.reviews.filter(r => r.rating === rating).length;
    return (count / this.reviews.length) * 100;
  }

  getRatingCount(rating: number): number {
    return this.reviews.filter(r => r.rating === rating).length;
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.reviews.length / this.reviewsPerPage);
    const start = (this.currentPage - 1) * this.reviewsPerPage;
    this.paginatedReviews = this.reviews.slice(start, start + this.reviewsPerPage);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
}