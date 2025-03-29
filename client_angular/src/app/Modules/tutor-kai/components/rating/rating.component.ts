import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss']
})
export class RatingComponent {
  @Output() ratingSubmitted = new EventEmitter<number>();

  rating = 0;
  hoverState = 0;

  /**
   * Setzt das Rating beim Klick auf einen Stern
   */
  onStar(star: number): void {
    this.rating = star;
  }

  /**
   * Aktualisiert den Hover-Zustand beim Mauszeigereintritt
   */
  onMouseEnter(star: number): void {
    this.hoverState = star;
  }

  /**
   * Setzt den Hover-Zustand zurück beim Verlassen mit dem Mauszeiger
   */
  onMouseLeave(): void {
    this.hoverState = 0;
  }

  /**
   * Emittiert das Rating an die übergeordnete Komponente
   */
  submitRating(): void {
    if (this.rating > 0) {
      this.ratingSubmitted.emit(this.rating);
    }
  }
}
