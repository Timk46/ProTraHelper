import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';

@Injectable({
    providedIn: 'root'
})
export class ConfettiService {

    constructor() { }

    public canon(): void {
        confetti({
            angle: this.randomInRange(55, 125),
            spread: this.randomInRange(200, 300),
            startVelocity: 40,
            particleCount: 400,
            origin: {
              x: this.randomInRange(30, 70)/100,
              y: this.randomInRange(30, 70)/100
            }
        });
    }

    public celebrate(count: number, delay: number): void {
      for (let i = 0; i < count; i++) {
          setTimeout(() => {
              this.canon();
          }, i * delay);
      }
  }

    private randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }
}
