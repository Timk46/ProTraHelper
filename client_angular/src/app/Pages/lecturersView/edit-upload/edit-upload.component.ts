import { OnInit } from '@angular/core';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { detailedQuestionDTO, detailedUploadQuestionDTO } from '@DTOs/index';
import { questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

interface EditUploadDialogData {
  questionId: number;
}

@Component({
  selector: 'app-edit-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './edit-upload.component.html',
  styleUrl: './edit-upload.component.scss',
})
export class EditUploadComponent implements OnInit {
  detailedQuestion: detailedQuestionDTO | undefined;
  uploadForm: FormGroup;
  isSaving = false;

  // Common file types for selection
  fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc,docx', label: 'Word Dokument' },
    { value: 'jpg,jpeg,png', label: 'Bild (JPG, PNG)' },
    { value: 'zip', label: 'ZIP Archiv' },
    { value: 'txt', label: 'Text Datei' },
    { value: '*', label: 'Alle Dateitypen' },
  ];

  // Common file sizes (in MB)
  fileSizes = [
    { value: 1, label: '1 MB' },
    { value: 5, label: '5 MB' },
    { value: 10, label: '10 MB' },
    { value: 25, label: '25 MB' },
    { value: 50, label: '50 MB' },
    { value: 100, label: '100 MB' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly questionDataService: QuestionDataService,
    private readonly snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EditUploadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditUploadDialogData,
  ) {
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      textHTML: [''],
      maxSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      fileType: ['*', Validators.required],
    });
  }

  ngOnInit(): void {
    this.questionDataService
      .getDetailedQuestionData(this.data.questionId, questionType.UPLOAD)
      .subscribe((data: detailedQuestionDTO) => {
        console.log('Received detailed question data:', data);
        this.detailedQuestion = data;
        this.uploadForm.patchValue({
          title: data.name,
        });
        if (this.detailedQuestion.uploadQuestion) {
          this.detailedQuestion.uploadQuestion.maxSize = Math.floor(
            (data.uploadQuestion?.maxSize || 10) / 1024 / 1024,
          ); // Convert bytes to MB
          this.setFormData(this.detailedQuestion.uploadQuestion);
        }
      });
  }

  private setFormData(uploadQuestion: detailedUploadQuestionDTO): void {
    this.uploadForm.patchValue({
      title: uploadQuestion.title,
      text: uploadQuestion.text,
      textHTML: uploadQuestion.textHTML,
      maxSize: uploadQuestion.maxSize,
      fileType: uploadQuestion.fileType,
    });
  }

  onSave(): void {
    if (this.uploadForm.valid && this.detailedQuestion) {
      this.isSaving = true;

      this.detailedQuestion.name = this.uploadForm.value.title;
      this.detailedQuestion.uploadQuestion = {
        ...this.detailedQuestion.uploadQuestion,
        ...this.uploadForm.value,
        maxSize: this.uploadForm.value.maxSize * 1024 * 1024, // Convert MB to bytes
      };

      // update and wait for the response
      this.questionDataService.updateWholeQuestion(this.detailedQuestion).subscribe({
        next: () => {
          this.snackBar.open('Frage erfolgreich gespeichert!', 'Schließen', {
            duration: 3000,
          });
          this.isSaving = false;
        },
        error: error => {
          this.snackBar.open('Fehler beim Speichern der Frage: ' + error.message, 'Schließen', {
            duration: 3000,
          });
          this.isSaving = false;
        },
      });
    } else {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus.', 'Schließen', {
        duration: 3000,
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
