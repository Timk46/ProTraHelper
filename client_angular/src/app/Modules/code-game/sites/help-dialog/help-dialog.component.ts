import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.component.html',
  styleUrls: ['./help-dialog.component.scss']
})
export class HelpDialogComponent {
  driveGifPath = 'assets/img/codeGame/drive.gif';
  analyseItemGifPath = 'assets/img/codeGame/analyse_item.gif';
  turnRightGifPath = 'assets/img/codeGame/turn_right.gif';
  turnLeftGifPath = 'assets/img/codeGame/turn_left.gif';
  
  languageSpecificHelp: { [key: string]: string } = {
    'cpp': `
      <h3>C++ Spezifische Hilfe</h3>
      <div class="help-grid">
        <div class="grid-item">
          <code>drive()</code>
          <p>Bewegt den Spieler in seine aktuelle Richtung um ein Feld weiter</p>
          <img src="${this.driveGifPath}" alt="drive-gif"/>
        </div>
        <div class="grid-item">
          <code>turn(ActorDirection.RIGHT)</code>
          <code>turn(ActorDirection.LEFT)</code>
          <p>Dreht den Spieler um 90 Grad nach rechts oder links</p>
          <div class="turn-gifs">
            <img src="${this.turnRightGifPath}" alt="turn_right-gif"/>
            <img src="${this.turnLeftGifPath}" alt="turn_left-gif"/>
          </div>
        </div>
        <div class="grid-item">
          <code>analyse_item()</code>
          <p>Prüft ob sich an der aktuellen Position ein Item befindet, wenn ja, wird dieses aufgenommen</p>
          <img src="${this.analyseItemGifPath}" alt="analyse_item-gif"/>
        </div>
        <div class="grid-item">
          <code>std::cout << "Text" << std::endl;</code>
          <p>Kann verwendet werden um Text auszugeben</p>
        </div>
        <div class="grid-item">
          <code>check_destination()</code>
          <p>Prüft ob der Spieler das Ziel erreicht hat</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle()</code>
          <p>Prüft ob sich ein Hindernis in der aktuellen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle_in_direction(direction)</code>
          <p>Prüft ob sich ein Hindernis in der angegebenen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_world_bounds_in_direction(direction)</code>
          <p>Prüft ob der Spieler in die angegebene Richtung das Spielfeld verlässt</p>
        </div>
      </div>
    `,
    'java': `
      <h3>Java Spezifische Hilfe</h3>
      <div class="help-grid">
        <div class="grid-item">
          <code>drive()</code>
          <p>Bewegt den Spieler in seine aktuelle Richtung um ein Feld weiter</p>
          <img src="${this.driveGifPath}" alt="drive-gif"/>
        </div>
        <div class="grid-item">
          <code>turn(ActorDirection.RIGHT)</code>
          <code>turn(ActorDirection.LEFT)</code>
          <p>Dreht den Spieler um 90 Grad nach rechts oder links</p>
          <div class="turn-gifs">
            <img src="${this.turnRightGifPath}" alt="turn_right-gif"/>
            <img src="${this.turnLeftGifPath}" alt="turn_left-gif"/>
          </div>
        </div>
        <div class="grid-item">
          <code>analyse_item()</code>
          <p>Prüft ob sich an der aktuellen Position ein Item befindet, wenn ja, wird dieses aufgenommen</p>
          <img src="${this.analyseItemGifPath}" alt="analyse_item-gif"/>
        </div>
        <div class="grid-item">
          <code>System.out.println("Text");</code>
          <p>Kann verwendet werden um Text auszugeben</p>
        </div>
        <div class="grid-item">
          <code>check_destination()</code>
          <p>Prüft ob der Spieler das Ziel erreicht hat</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle()</code>
          <p>Prüft ob sich ein Hindernis in der aktuellen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle_in_direction(direction)</code>
          <p>Prüft ob sich ein Hindernis in der angegebenen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_world_bounds_in_direction(direction)</code>
          <p>Prüft ob der Spieler in die angegebene Richtung das Spielfeld verlässt</p>
        </div>
      </div>
    `,
    'python': `
      <h3>Python Spezifische Hilfe</h3>
      <div class="help-grid">
        <div class="grid-item">
          <code>drive()</code>
          <p>Bewegt den Spieler in seine aktuelle Richtung um ein Feld weiter</p>
          <img src="${this.driveGifPath}" alt="drive-gif"/>
        </div>
        <div class="grid-item">
          <code>turn(ActorDirection.RIGHT)</code>
          <code>turn(ActorDirection.LEFT)</code>
          <p>Dreht den Spieler um 90 Grad nach rechts oder links</p>
          <div class="turn-gifs">
            <img src="${this.turnRightGifPath}" alt="turn_right-gif"/>
            <img src="${this.turnLeftGifPath}" alt="turn_left-gif"/>
          </div>
        </div>
         <div class="grid-item">
          <code>analyse_item()</code>
          <p>Prüft ob sich an der aktuellen Position ein Item befindet, wenn ja, wird dieses aufgenommen</p>
          <img src="${this.analyseItemGifPath}" alt="analyse_item-gif"/>
        </div>
        <div class="grid-item">
          <code>print("Text")</code>
          <p>Kann verwendet werden um Text auszugeben</p>
        </div>
        <div class="grid-item">
          <code>check_destination()</code>
          <p>Prüft ob der Spieler das Ziel erreicht hat</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle()</code>
          <p>Prüft ob sich ein Hindernis in der aktuellen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_obstacle_in_direction(direction)</code>
          <p>Prüft ob sich ein Hindernis in der angegebenen Richtung befindet</p>
        </div>
        <div class="grid-item">
          <code>check_world_bounds_in_direction(direction)</code>
          <p>Prüft ob der Spieler in die angegebene Richtung das Spielfeld verlässt</p>
        </div>
      </div>
    `
  };

  constructor(
    public dialogRef: MatDialogRef<HelpDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { language: string }
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  getLanguageSpecificHelp(): string {
    return this.languageSpecificHelp[this.data.language] || '';
  }
} 