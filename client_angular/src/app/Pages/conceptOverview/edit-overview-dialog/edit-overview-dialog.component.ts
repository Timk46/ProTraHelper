import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EditorModule } from '@tinymce/tinymce-angular';
import { TinymceModule } from '../../tinymce/tinymce.module';
import { TinymceComponent } from '../../tinymce/tinymce.component';

export interface EditOverviewDialogData {
  name: string;
  description: string;
  descriptionHTML: string;
}

@Component({
  selector: 'app-edit-overview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    EditorModule,
    TinymceModule,
  ],
  templateUrl: './edit-overview-dialog.component.html',
  styleUrl: './edit-overview-dialog.component.scss',
})
export class EditOverviewDialogComponent implements AfterViewInit {
  @ViewChild('desceditor') editor!: TinymceComponent;

  name: string;
  description: string;
  descriptionHTML: string;

  // TinyMCE configuration
  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  };

  constructor(
    public dialogRef: MatDialogRef<EditOverviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditOverviewDialogData,
  ) {
    this.name = data.name;
    this.description = data.description;
    this.descriptionHTML = data.descriptionHTML || '';
  }

  /*  ngOnInit(): void {
    this.editor.setContent('hallo');
  } */

  ngAfterViewInit(): void {
    this.editor.setContent(this.descriptionHTML || this.description || '');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const result = {
      name: this.name,
      description: this.editor.getRawContent(),
      descriptionHTML: this.editor.getContent(),
    };
    this.dialogRef.close(result);
  }
}
