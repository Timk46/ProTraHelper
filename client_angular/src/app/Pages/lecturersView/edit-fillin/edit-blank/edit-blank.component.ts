import type { OnInit } from '@angular/core';
import { Component, Inject } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { SafeUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-edit-blank',
  templateUrl: './edit-blank.component.html',
  styleUrls: ['./edit-blank.component.scss'],
})
export class EditBlankComponent implements OnInit {
  form!: FormGroup;
  isImage: boolean;
  previewImage: SafeUrl | null = null;

  constructor(
    public dialogRef: MatDialogRef<EditBlankComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { word: string; isDistractor: boolean; isImage: boolean },
    private readonly fb: FormBuilder,
    private readonly sanitizer: DomSanitizer,
  ) {
    this.isImage = data.isImage;
  }

  ngOnInit() {
    this.form = this.fb.group({
      word: [this.data.word, Validators.required],
      file: [null],
    });

    if (this.isImage) {
      this.setPreviewImage(this.data.word);
    }
  }

  setPreviewImage(imageSource: string) {
    // Check if the imageSource is a valid URL or base64 string
    if (
      imageSource.startsWith('data:image') ||
      imageSource.startsWith('http') ||
      imageSource.startsWith('blob:')
    ) {
      this.previewImage = this.sanitizer.bypassSecurityTrustUrl(imageSource);
    } else {
      console.error('Invalid image source:', imageSource);
      this.previewImage = null;
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        this.setPreviewImage(result);
      };
      reader.readAsDataURL(file);
      this.form.patchValue({ file: file });
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      if (this.isImage) {
        // If a new file was selected, return that. Otherwise, return the current preview image.
        const fileToReturn = this.form.get('file')?.value || this.data.word;
        this.dialogRef.close(fileToReturn);
      } else {
        this.dialogRef.close(this.form.get('word')?.value);
      }
    }
  }
}
