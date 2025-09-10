import { AfterViewInit, Component, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ContentDTO, ContentUpdateDTO } from '@DTOs/index';
import { TinymceComponent } from '../../tinymce/tinymce.component';

@Component({
  selector: 'app-content-list-node-edit-dialog',
  templateUrl: './content-list-node-edit-dialog.component.html',
  styleUrls: ['./content-list-node-edit-dialog.component.scss'],
})
export class ContentListNodeEditDialogComponent implements AfterViewInit {
  @ViewChild('desceditor') editor!: TinymceComponent;

  name: string;
  taskSectorTitle: string;
  description: string;
  descriptionHTML: string;
  difficulty: number;

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
    private readonly dialogRef: MatDialogRef<ContentListNodeEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContentDTO,
  ) {
    this.name = data.name;
    this.description = data.description;
    this.descriptionHTML = data.descriptionHTML || '';
    this.difficulty = data.level;
    this.taskSectorTitle = data.taskSectorTitle || '';
  }

  ngAfterViewInit(): void {
    this.editor.setContent(this.descriptionHTML || this.description || '');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    const result: ContentUpdateDTO = {
      name: this.name,
      description: this.editor.getRawContent(),
      descriptionHTML: this.editor.getContent(),
      taskSectorTitle: this.taskSectorTitle,
      difficulty: this.difficulty,
    };
    this.dialogRef.close(result);
  }
}
