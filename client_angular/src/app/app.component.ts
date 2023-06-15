import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title: string = 'client_angular';
  ergebnis: number = 0;

  /**
   * ngOnInit gets automatically called after the constructor
   */
  ngOnInit() {
    this.ergebnis = this.getResult(3, 3);
  }

  /**
   * Performs a very special operation (This is an example for documentation)
   *
   * @example
   * Simply call it with 2 numbers:
   * getResult(2, 3)
   *
   * @param {number} a First number
   * @param {number} b Second number
   * @returns The sum of a and b
   */
  getResult(a: number, b: number): number {
    return a + b;
  }
}
