import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EditorModule } from '@tinymce/tinymce-angular';

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
    EditorModule
  ],
  templateUrl: './edit-overview-dialog.component.html',
  styleUrl: './edit-overview-dialog.component.scss',
})
export class EditOverviewDialogComponent implements OnInit {
  name: string;
  description: string;
  descriptionHTML: string;

  // TinyMCE configuration
  tinymceConfig = {
    height: 300,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar:
      'undo redo | blocks | bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
  };

  constructor(
    public dialogRef: MatDialogRef<EditOverviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditOverviewDialogData
  ) {
    this.name = data.name;
    this.description = data.description;
    this.descriptionHTML = data.descriptionHTML || '';
  }

  ngOnInit(): void {
    // If there's no HTML content but there's plain text, use the plain text as initial HTML
    if (!this.descriptionHTML && this.description) {
      this.descriptionHTML = `<p>${this.description}</p>`;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const result = {
      name: this.name,
      description: this.description,
      descriptionHTML: this.descriptionHTML
    };
    this.dialogRef.close(result);
  }
}
