import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation-box.component.html',
  styleUrls: ['./confirmation-box.component.scss']
})
export class ConfirmationBoxComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string,
      message: string,
      decline: string,
      accept: string,
      swapButtons: boolean,
      swapColors: boolean
    }
  ) {}
}
