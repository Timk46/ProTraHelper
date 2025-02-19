import { Component } from '@angular/core';

@Component({
  selector: 'app-uml-editor-popup',
  templateUrl: './uml-editor-popup.component.html',
  styleUrls: ['./uml-editor-popup.component.scss']
})
export class UmlEditorPopupComponent {

  constructor() { }

  onCancelClick(): void {
    console.log('Cancel clicked');
  }

  onSaveClick(): void {
    console.log('Save clicked');
  }

}
