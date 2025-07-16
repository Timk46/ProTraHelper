import { ElementRef, Renderer2 } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { animate, style, transition, trigger, state, keyframes } from '@angular/animations';

enum PlayerDirection {
  NORTH = 270,
  EAST = 0,
  SOUTH = 90,
  WEST = 180,
}

@Component({
  selector: 'app-playfield',
  templateUrl: './playfield.component.html',
  styleUrls: ['./playfield.component.scss'],
  animations: [
    trigger('movePlayer', [
      transition(
        '* => *',
        [
          animate(
            '{{animationSpeedMaster}}ms linear',
            style({
              transform: 'translate({{endX}}px, {{endY}}px)',
            }),
          ),
        ],
        { params: { endX: 0, endY: 0 } },
      ),
    ]),
    trigger('dimChase', [
      state('off', style({ opacity: 0.3 })),
      state('on', style({ opacity: 1 })),
      transition('off => on', [animate('0.3s ease-in-out')]),
      transition('on => off', [animate('1.5s ease-in-out')]),
    ]),
  ],
})
export class PlayfieldComponent {
  gameField: string[][] = [];
  inputGameFile = '';
  gameCellRestrictions: any[][] = []; // restrictions for the game cells ('B' = blacklisted, 'W' = whitelisted)
  cellRestrictionsDimState: ('off' | 'on')[][] = [];
  cellRestrictionsDimChaseIntervals: any[] = [];
  gameFieldWidth: number = 0;
  gameFieldHeight: number = 0;
  cellSize: number = 60;
  theme: string = ''; // part of the path to the images
  hiddenItems: string[] = [];

  isPlayerVisible: boolean = true;
  playerPosition = { x: 0, y: 0 };
  playerDirection: PlayerDirection = PlayerDirection.EAST; // default direction
  startX = 0;
  startY = 0;
  endX = 0;
  endY = 0;
  playerTransform: string = '';
  playerInitialPosition: { x: number; y: number } = { x: 0, y: 0 };
  playerPositionIsSet = false; // true, if the player position is set

  gameOutputInformation: string = 'Bereit für die Ausführung';
  compilerGameOutput: string[] = [];

  // Event emitter to notify the workspace component that the game animation has finished
  @Output() gameAnimationFinished = new EventEmitter<void>();
  animationSpeedMaster = 500; // animation speed in ms

  isSysWarning: boolean = false;

  constructor(
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
  ) {}

  initGameField(_game: string, _theme: string, _gameCellRestrictions: string): void {
    this.inputGameFile = _game;
    this.theme = _theme;
    this.gameCellRestrictions = this.transformStringToArray(_gameCellRestrictions);

    if (this.theme === '') {
      console.error('Theme is not set.');
      return;
    }

    this.fillGameField();
    this.setCSSVariables();
    this.initPlayer();
  }

  initPlayer(): void {
    if (this.gameFieldHeight === 0 || this.gameFieldWidth === 0) {
      console.error('Game field dimensions are not set.');
      return;
    }

    if (this.gameField.length === 0) {
      console.error('Game field is empty.');
      return;
    }

    for (let row = 0; row < this.gameFieldHeight; row++) {
      for (let col = 0; col < this.gameFieldWidth; col++) {
        if (this.gameField[row][col] === 'P') {
          this.startX = col * this.cellSize;
          this.startY = row * this.cellSize;
          this.endX = col * this.cellSize;
          this.endY = row * this.cellSize;

          this.playerInitialPosition = { x: col, y: row };
          this.playerPosition = { x: col, y: row };
          this.playerTransform = `translate(${this.startX}px, ${this.startY}px)`;
          this.playerPositionIsSet = true;

          return; // Exit the loop once the player is found
        }
      }
    }

    console.error('Player not found in the game field.');
  }

  transformStringToArray(string: string): any[][] {
    return string.split('\n').map(row => row.split(''));
  }

  movePlayerTo(newX: number, newY: number): void {
    const endX = newX * this.cellSize;
    const endY = newY * this.cellSize;

    // Update the player position and transformation
    this.playerPosition = { x: newX, y: newY };
    this.playerTransform = `translate(${endX}px, ${endY}px) rotate(${this.playerDirection}deg)`;
  }

  rotatePlayerTo(direction: PlayerDirection): void {
    const endX = this.playerPosition.x * this.cellSize;
    const endY = this.playerPosition.y * this.cellSize;

    /* Turn in the direction of the smallest angle to prevent the player from turning around 360 degrees */
    const currentDirection = this.playerDirection;
    const targetDirection = direction;

    // Calculate the difference between the current and target direction
    let diff = targetDirection - currentDirection;

    // Normalize the difference to the range -180 to 180
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    // Update the direction based on the shortest rotation
    this.playerDirection = currentDirection + diff;

    // Update the player direction and transformation
    this.playerTransform = `translate(${endX}px, ${endY}px) rotate(${this.playerDirection}deg)`;
  }

  hideItemImage(row: string, col: string): void {
    const itemImage = this.el.nativeElement.querySelector(`#item-${row}-${col}`);
    if (itemImage) {
      this.renderer.setStyle(itemImage, 'display', 'none');
      this.hiddenItems.push(`#item-${row}-${col}`);
    }
  }

  showItemImage(): void {
    for (let i = 0; i < this.hiddenItems.length; i++) {
      this.renderer.setStyle(
        this.el.nativeElement.querySelector(this.hiddenItems[i]),
        'display',
        'block',
      );
    }

    this.hiddenItems = [];
  }

  toggleDimChase(col: number, row: number): void {
    if (this.cellRestrictionsDimState[row][col] === 'on') {
      this.cellRestrictionsDimState[row][col] = 'off';
    } else {
      this.cellRestrictionsDimState[row][col] = 'on';
    }
  }

  checkCellRestrictionAndShowWarning(col: number, row: number): void {
    if (this.gameCellRestrictions[row][col] === 'B') {
      const overlay = this.el.nativeElement.querySelector(
        `.row:nth-child(${row + 1}) .cell:nth-child(${col + 1}) .overlay`,
      );
      if (overlay) {
        setTimeout(() => {
          this.renderer.setStyle(overlay, 'display', 'block');
          this.toggleDimChase(col, row);
          const intervalId = setInterval(() => {
            this.toggleDimChase(col, row);
          }, 1500); // Keep toggling the state every 1.5 seconds
          this.cellRestrictionsDimChaseIntervals.push(intervalId);
        }, 500); // Delay, show the overlay after the player has moved to the cell
      } else {
        console.error('Overlay element not found');
      }
    }
  }

  setSysWarning(state: boolean) {
    this.isSysWarning = state;
  }

  hideAllWaringOverlays(): void {
    const overlays = this.el.nativeElement.querySelectorAll('.overlay');
    overlays.forEach((overlay: any) => {
      this.renderer.setStyle(overlay, 'display', 'none');
      this.renderer.setStyle(overlay, 'opacity', '0');
    });

    // reset everything of the cell restrictions
    this.cellRestrictionsDimState = this.gameField.map(row => row.map(() => 'off'));

    this.cellRestrictionsDimChaseIntervals.forEach(intervalId => clearInterval(intervalId));
    this.cellRestrictionsDimChaseIntervals = [];
  }

  fillGameField(): void {
    // Generate a 2D array from the input string.
    // Each new line is a new row, and each character is a new column.
    this.gameField = this.inputGameFile.split('\n').map(row => row.split(''));
    this.gameFieldWidth = this.gameField[0].length;
    this.gameFieldHeight = this.gameField.length;

    this.cellRestrictionsDimState = this.gameField.map(row => row.map(() => 'off'));
  }

  setCSSVariables(): void {
    const fieldElement = this.el.nativeElement.querySelector('.field');
    if (fieldElement) {
      // Set the CSS variables for the grid dimensions
      this.renderer.setStyle(fieldElement, '--rows', this.gameFieldHeight);
      this.renderer.setStyle(fieldElement, '--columns', this.gameFieldWidth);
      this.renderer.setStyle(fieldElement, '--cell-size', `${this.cellSize}px`);

      // Set the CSS variable for the animation speed
      this.renderer.setStyle(fieldElement, '--animation-speed-master', this.animationSpeedMaster);
    } else {
      console.error('Element with class "field" not found');
    }
  }

  // used for the obstacle and destination images
  getObjectImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell === 'O') return 'assets/img/codeGame/' + this.theme + '/obstacle.png';
    if (cell === 'D') return 'assets/img/codeGame/' + this.theme + '/destination.png';
    if (cell === 'I') return 'assets/img/codeGame/' + this.theme + '/item.png';
    return '';
  }

  getObjectId(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell === 'O') return 'obstacle-' + row + '-' + col;
    if (cell === 'D') return 'destination-' + row + '-' + col;
    if (cell === 'I') return 'item-' + row + '-' + col;
    return '';
  }

  getPlayerImage(): string {
    return 'assets/img/codeGame/' + this.theme + '/player.png';
  }

  getFloorImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell) return 'assets/img/codeGame/' + this.theme + '/floor.png';
    return '';
  }

  startGame(gameOutput: string[]): void {
    this.gameOutputInformation = 'Spiel wird ausgeführt...';
    this.compilerGameOutput = gameOutput;

    // game animation
    this.compilerGameOutput.forEach((line, index) => {
      setTimeout(() => {
        this.actPlayer(line);
      }, index * this.animationSpeedMaster);
    });

    // Calculate the total duration of the animations
    const totalDuration = this.compilerGameOutput.length * this.animationSpeedMaster;

    // Run the code after all animations are finished
    setTimeout(() => {
      // game is finished
      this.gameOutputInformation = 'Spiel wurde ausgeführt';
      this.gameAnimationFinished.emit();
    }, totalDuration);
  }

  actPlayer(command: string): void {
    const action = command.split(':')[0];
    const move = command.split(':')[1];

    if (action == '#SYS-Move') {
      this.gameOutputInformation = ''; // clear the information

      const coordinates = move.split('/');
      this.movePlayerTo(parseInt(coordinates[0]), parseInt(coordinates[1]));
      this.checkCellRestrictionAndShowWarning(parseInt(coordinates[0]), parseInt(coordinates[1]));
    } else if (action == '#SYS-Turn') {
      this.gameOutputInformation = ''; // clear the information

      switch (move) {
        case 'NORTH':
          this.rotatePlayerTo(PlayerDirection.NORTH);
          break;
        case 'EAST':
          this.rotatePlayerTo(PlayerDirection.EAST);
          break;
        case 'SOUTH':
          this.rotatePlayerTo(PlayerDirection.SOUTH);
          break;
        case 'WEST':
          this.rotatePlayerTo(PlayerDirection.WEST);
          break;
        default:
          console.error('Unknown direction: ', move);
      }
    } else if (action == '#SYS-RemoveItem') {
      const coordinates = move.split('/');
      this.hideItemImage(coordinates[1], coordinates[0]);
    } else if (action == '#SYS-Info') {
      this.gameOutputInformation = move;
    } else if (action == '#SYS-Warning') {
      this.setSysWarning(true);
    } else if (action == '#SYS-Success') {
      // Informations are valuated in the backend
    } else {
      console.error('Unknown action: ', action);
    }
  }

  resetGame(): void {
    // Hide the player
    this.isPlayerVisible = false;

    // reset the game field
    this.showItemImage();
    this.hideAllWaringOverlays();
    this.setSysWarning(false);
    this.playerPosition = this.playerInitialPosition;
    this.playerDirection = PlayerDirection.EAST;
    this.playerTransform = `translate(${this.startX}px, ${this.startY}px) rotate(${this.playerDirection}deg)`;

    // reset the game output information
    this.gameOutputInformation = 'Bereit für die Ausführung';

    // Show the player after resetting the position
    setTimeout(() => {
      this.isPlayerVisible = true;
    }, 0); // Adjust the timeout duration if needed
  }
}
