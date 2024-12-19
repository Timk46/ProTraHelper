import { Component, ElementRef, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-playfield',
  templateUrl: './playfield.component.html',
  styleUrls: ['./playfield.component.scss']
})
export class PlayfieldComponent {
  inputGameFile = '';
  gameField: string[][] = [];
  gameFieldWidth: number = 0;
  gameFieldHeight: number = 0;
  cellSize: number = 50;
  gameOutputInformation: string = '';
  compilerGameOutput: string[] = [];

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  initGameField(_game: string): void {
    this.inputGameFile = _game;

    this.fillGameField();
    this.setGridDimensions();
  }


  fillGameField(): void {
    // Generate a 2D array from the input string.
    // Each new line is a new row, and each character is a new column.
    this.gameField = this.inputGameFile.split('\n').map(row => row.split(''));
    this.gameFieldWidth = this.gameField[0].length;
    this.gameFieldHeight = this.gameField.length;
  }

  setGridDimensions(): void {
    this.renderer.setStyle(this.el.nativeElement.querySelector('.field'), '--rows', this.gameFieldHeight);
    this.renderer.setStyle(this.el.nativeElement.querySelector('.field'), '--columns', this.gameFieldWidth);
    this.renderer.setStyle(this.el.nativeElement.querySelector('.field'), '--cell-size', `${this.cellSize}px`);
  }

  getActorImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell === 'P') return 'assets/img/player.png';
    if (cell === 'O') return 'assets/img/obstacle.png';
    if (cell === 'D') return 'assets/img/destination.png';
    return '';
  }

  getFloorImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell) return 'assets/img/floor.png';
    return '';
  }
}
