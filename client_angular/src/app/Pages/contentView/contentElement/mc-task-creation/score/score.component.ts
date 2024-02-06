import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-score',
  templateUrl:  './score.component.html',
  styleUrls: ['./score.component.scss']
})
export class ScoreComponent {


  constructor(
    public dialogref: MatDialogRef<ScoreComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {score: number}  ) { }


  onNoClick() {
    this.dialogref.close();
  }

}
