import { Component, ElementRef, Input, Renderer2 } from '@angular/core';
import { animate, style, transition, trigger } from "@angular/animations";

@Component({
  selector: 'app-playfield',
  templateUrl: './playfield.component.html',
  styleUrls: ['./playfield.component.scss'],
  animations: [
    trigger('moveActor', [
      transition('* => *', [
        animate('2000ms linear', style({
          transform: 'translate({{endX}}px, {{endY}}px)'
        })),
      ], { params: { endX: 0, endY: 0 } }),
    ]),
  ],
})

export class PlayfieldComponent {
  @Input() gameField: string[][] = [];
  inputGameFile = '';
  gameFieldWidth: number = 0;
  gameFieldHeight: number = 0;
  cellSize: number = 60;

  @Input() actorPosition = { x: 0, y: 0 };
  startX = 0;
  startY = 0;
  endX = 0;
  endY = 0;
  roverTransform: string = '';
  roverPositstionIsSet = false; // true, if the rover position is set

  gameOutputInformation: string = 'Bereit für die Ausführung';
  compilerGameOutput: string[] = [];

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  initGameField(_game: string): void {
    this.inputGameFile = _game;

    this.fillGameField();
    this.setGridDimensions();
    this.initActor();
  }

  initActor(): void {
    console.log("Initializing actor...");

    if (this.gameFieldHeight === 0 || this.gameFieldWidth === 0) {
      console.error("Game field dimensions are not set.");
      return;
    }

    if (this.gameField.length === 0) {
      console.error("Game field is empty.");
      return;
    }

    for (let row = 0; row < this.gameFieldHeight; row++) {
      for (let col = 0; col < this.gameFieldWidth; col++) {
        if (this.gameField[row][col] === 'P') {
          this.startX = col * this.cellSize;
          this.startY = row * this.cellSize;
          this.endX = col * this.cellSize;
          this.endY = row * this.cellSize;

          console.log("Actor initialized at: ", this.startX, this.startY);

          this.actorPosition = { x: col, y: row };
          this.roverTransform = `translate(${this.startX}px, ${this.startY}px)`;

          this.roverPositstionIsSet = true
          return; // Exit the loop once the player is found
        }
      }
    }

    console.error("Player not found in the game field.");
  }

  moveActorTo(newX: number, newY: number): void {
    const startX = this.actorPosition.x * this.cellSize;
    const startY = this.actorPosition.y * this.cellSize;
    const endX = newX * this.cellSize;
    const endY = newY * this.cellSize;

    const steps = 50; // Number if intermediate positions
    const interval = 40; // Time between steps in ms
    let currentStep = 0;

    // Update the position step by step
    const moveInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      // Interpolated position calculation
      const interpolatedX = startX + (endX - startX) * progress;
      const interpolatedY = startY + (endY - startY) * progress;

      console.log("Moving to: ", interpolatedX, interpolatedY);

      // Transformation style update
      this.roverTransform = `translate(${interpolatedX}px, ${interpolatedY}px)`;

      // End animation
      if (currentStep >= steps) {
        clearInterval(moveInterval);
        this.actorPosition = { x: newX, y: newY }; // Update the actor position
      }
    }, interval);
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

  // used for the obstacle and destination images
  getObjectImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell === 'O') return 'assets/img/obstacle.png';
    if (cell === 'D') return 'assets/img/destination.png';
    return '';
  }

  getActorImage(): string {
    return 'assets/img/player.png';
  }

  getFloorImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell) return 'assets/img/floor.png';
    return '';
  }

  startGame(gameOutput: string[]): void {
    this.gameOutputInformation = 'Spiel wird ausgeführt...';
    this.compilerGameOutput = gameOutput;

    // show each console output line with a delay of 1 second
    // this.compilerGameOutput.forEach((line, index) => {
    //   setTimeout(() => {
    //     this.gameOutputInformation = line;
    //   }, index * 1000);
    // });

    // move the actor
    // this.compilerGameOutput.forEach((line, index) => {
    //   this.actActor(line);
    //
    //
    // });



    // this.actActor("#SYS-Move:7/8");

    this.moveActorTo(7, 7);
    this.moveActorTo(7, 8);
  }

  actActor(comand: String): void {
    const action = comand.split(':')[0];
    const move = comand.split(':')[1];

    if (action == "#SYS-Move") {
      const cordinates = move.split('/');
      // this.moveActorTo(parseInt(cordinates[0]), parseInt(cordinates[1]));

    } else if (action == "#SYS-Turn") {

    } else if (action == "#SYS-Info") {

    } else {
      console.error("Unknown action: ", action);
    }
  }

}
