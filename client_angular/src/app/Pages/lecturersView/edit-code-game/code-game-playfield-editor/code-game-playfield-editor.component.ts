import { Component, ElementRef, Renderer2, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-code-game-playfield-editor',
  templateUrl: './code-game-playfield-editor.component.html',
  styleUrls: ['./code-game-playfield-editor.component.scss']
})
export class CodeGamePlayfieldEditorComponent implements OnInit {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  codeGameForm: FormGroup;
  gameField: any[][] = [];
  selectedCell = { row: 0, col: 0 };

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private el: ElementRef
  ) {
    this.codeGameForm = this.fb.group({
      theme: ['fantasy'],
      rowsAndColumns: [10]
    });
  }

  ngOnInit(): void {
    this.generateGameField();
    this.codeGameForm.valueChanges.subscribe(() => {
      this.generateGameField();
    });
  }

  generateGameField(): void {
    const size = this.codeGameForm.get('rowsAndColumns')?.value || 10;
    this.gameField = Array.from({ length: size }, () => Array(size).fill("#"));

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

  getFloorImage(i: number, j: number): string {
    return 'assets/img/floor.png';
  }

  getObjectImage(row: number, col: number): string {
    const cell = this.gameField[row][col];
    if (cell === 'O') return 'assets/img/obstacle.png';
    if (cell === 'D') return 'assets/img/destination.png';
    if (cell === 'R') return 'assets/img/rock.png';
    if (cell === 'P') return 'assets/img/player.png';
    return '';
  }

  onClick(event: MouseEvent, row: number, col: number): void {
    this.selectedCell = { row, col };
  }

  setObject(object: string): void {
    this.gameField[this.selectedCell.row][this.selectedCell.col] = object;
  }
}
