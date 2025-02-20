import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EditorPopupComponent } from 'src/app/Modules/umlearn/pages/editor/editor-popup/editor-popup.component';

@Component({
  selector: 'app-uml-editor-popup',
  templateUrl: './uml-editor-popup.component.html',
  styleUrls: ['./uml-editor-popup.component.scss']
})
export class UmlEditorPopupComponent {

  popupTitle: string = '';

  constructor(
    public dialogRef: MatDialogRef<EditorPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {mode: string},
  ) {
    this.setPopupMode(data.mode);
  }

  onCancelClick(): void {
    console.log('Cancel clicked');
  }

  onSaveClick(): void {
    console.log('Save clicked');
  }

  setPopupMode(mode: string) {
    switch (mode) {
      case 'prefab':
        this.popupTitle = 'Vorlage';
        break;
      case 'solution':
        this.popupTitle = 'Lösung';
        break;
      default:
        this.popupTitle = 'Vorlage';
        break;
    }
  }

}
