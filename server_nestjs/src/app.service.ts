import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!' + this.getResult(3, 3); // The documentation of the function (see below) is also displayed when hovering over the functioncall
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
