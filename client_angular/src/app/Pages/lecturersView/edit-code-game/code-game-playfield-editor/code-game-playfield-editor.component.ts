import { ElementRef, Renderer2, OnInit, OnChanges, Component, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-code-game-playfield-editor',
  templateUrl: './code-game-playfield-editor.component.html',
  styleUrls: ['./code-game-playfield-editor.component.scss'],
})
export class CodeGamePlayfieldEditorComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @Input() inputGameData: any;
  @Output() dataChange = new EventEmitter<any>(); // TODO: change name

  codeGameForm: FormGroup;
  theme: string = 'dino'; // default theme. Used without form control to avoid reset all values of the game when changing the theme
  multiselect: string = '';
  gameField: any[][] = [];
  gameCellRestrictions: any[][] = [];
  selectedCell = { row: 0, col: 0 };

  isInputDataAvailable = false;
  inputDataSet = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly renderer: Renderer2,
    private readonly el: ElementRef,
  ) {
    this.codeGameForm = this.fb.group({
      rowsAndColumns: [10],
    });
  }

  ngOnInit(): void {
    this.generateGameField();
    this.codeGameForm.valueChanges.subscribe(() => {
      this.generateGameField();
    });
  }

  ngOnChanges(): void {
    if (this.inputGameData && !this.inputDataSet) {
      console.log('Input Playfield editor: ', this.inputGameData);
      this.isInputDataAvailable = true;

      this.theme = this.inputGameData.theme;

      if (this.inputGameData.gameField != '') {
        this.gameField = this.transformStringToArray(this.inputGameData.gameField);

        this.codeGameForm.patchValue({
          rowsAndColumns: this.gameField.length,
        });
      }

      if (this.inputGameData.gameCellRestrictions != '') {
        this.gameCellRestrictions = this.transformStringToArray(
          this.inputGameData.gameCellRestrictions,
        );
      }

      this.inputDataSet = true;
    }

    // In case the task is allready loaded and the user starteds a import
    if (this.inputGameData?.newDataByImportOperation) {
      console.log('Input Playfield editor by import: ', this.inputGameData);
      this.inputDataSet = false;
      this.isInputDataAvailable = true;

      /* Overwrite old data */
      this.theme = this.inputGameData.theme;
      this.gameField = this.transformStringToArray(this.inputGameData.gameField);
      this.codeGameForm.patchValue({
        rowsAndColumns: this.gameField.length,
      });
      this.gameCellRestrictions = this.transformStringToArray(
        this.inputGameData.gameCellRestrictions,
      );

      this.inputDataSet = true;
      this.inputGameData.newDataByImportOperation = false; // Reset the flag to avoid re-importing
    }
  }

  generateGameField(): void {
    console.log('Generate game field');
    if (this.isInputDataAvailable && !this.inputDataSet) {
      console.log('Playfield allready generated');
      return;
    }

    const size = this.codeGameForm.get('rowsAndColumns')?.value || 10;
    this.gameField = Array.from({ length: size }, () => Array(size).fill('#'));
    this.gameCellRestrictions = Array.from({ length: size }, () => Array(size).fill('.'));

    this.setCSSVariables();
  }

  setCSSVariables(): void {
    const playfieldElement = this.el.nativeElement.querySelector('.playfield');
    if (playfieldElement) {
      this.renderer.setStyle(playfieldElement, '--rows', this.codeGameForm.value.rowsAndColumns);
      this.renderer.setStyle(playfieldElement, '--columns', this.codeGameForm.value.rowsAndColumns);
    } else {
      console.error('Element with class "playfield" not found');
    }
  }

  // Change the theme only affects images, not the rest of the setted data
  onThemeChange(_theme: string): void {
    this.theme = _theme;
    this.emitData();
  }

  getFloorImage(): string {
    return 'assets/img/codeGame/' + this.theme + '/floor.png';
  }

  getObjectImage(row: number | null, col: number | null, objectPrefix: string | null): string {
    if (row != null && col != null) {
      const cell = this.gameField[row][col];
      if (cell === 'O') return 'assets/img/codeGame/' + this.theme + '/obstacle.png';
      if (cell === 'D') return 'assets/img/codeGame/' + this.theme + '/destination.png';
      if (cell === 'I') return 'assets/img/codeGame/' + this.theme + '/item.png';
      if (cell === 'P') return 'assets/img/codeGame/' + this.theme + '/player.png';
      return '';
    } else if (objectPrefix != null) {
      if (objectPrefix === 'O') return 'assets/img/codeGame/' + this.theme + '/obstacle.png';
      if (objectPrefix === 'D') return 'assets/img/codeGame/' + this.theme + '/destination.png';
      if (objectPrefix === 'I') return 'assets/img/codeGame/' + this.theme + '/item.png';
      if (objectPrefix === 'P') return 'assets/img/codeGame/' + this.theme + '/player.png';
      return '';
    }
    return '';
  }

  onClick(event: MouseEvent, row: number, col: number): void {
    this.selectedCell = { row, col };

    if (this.multiselect !== '') {
      if (
        this.multiselect === '#' ||
        this.multiselect === 'O' ||
        this.multiselect === 'I' ||
        this.multiselect === 'D' ||
        this.multiselect === 'P'
      ) {
        this.setObject(this.multiselect);
      } else if (this.multiselect === '.' || this.multiselect === 'B' || this.multiselect === 'W') {
        this.setRestriction(this.multiselect);
      }
    }
  }

  setObject(object: string): void {
    // Remove player or destination if already set
    if (object === 'P') this.removePlayer();
    if (object === 'D') this.removeDestination();

    this.gameField[this.selectedCell.row][this.selectedCell.col] = object;
    this.emitData();
  }

  removePlayer(): void {
    this.gameField = this.gameField.map(row => row.map(cell => (cell === 'P' ? '#' : cell)));
  }

  removeDestination(): void {
    this.gameField = this.gameField.map(row => row.map(cell => (cell === 'D' ? '#' : cell)));
  }

  setRestriction(restriction: string): void {
    this.gameCellRestrictions[this.selectedCell.row][this.selectedCell.col] = restriction;
    this.emitData();
  }

  isMenuDisabled(): boolean {
    return this.multiselect !== '';
  }

  /*
   ** -------------------------------------------------------------------
   ** Transfer data to parent component (edit-code-game.component.ts)
   */

  emitData(): void {
    const data = {
      theme: this.theme,
      gameField: this.transformArrayToString(this.gameField),
      gameCellRestrictions: this.transformArrayToString(this.gameCellRestrictions),
    };

    this.dataChange.emit(data);
  }

  transformArrayToString(array: any[][]): string {
    return array.map(row => row.join('')).join('\n');
  }

  transformStringToArray(string: string): any[][] {
    return string.split('\n').map(row => row.split(''));
  }
}
