import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EvaluationCategoryDTO } from '@DTOs/index';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Component({
  selector: 'app-new-category-dialog',
  templateUrl: './new-category-dialog.component.html',
  styleUrls: ['./new-category-dialog.component.scss'],
})
export class NewCategoryDialogComponent {
  categoryForm: FormGroup;
  isSaving = false;

  // Vordefinierte Icons zur Auswahl
  availableIcons = [
    'category',
    'label',
    'bookmark',
    'star',
    'flag',
    'tag',
    'folder',
    'assignment',
    'grade',
    'school',
    'book',
    'lightbulb',
    'build',
    'code',
    'science',
    'calculate',
    'article',
    'quiz',
  ];

  // Vordefinierte Farben zur Auswahl
  availableColors = [
    '#f44336',
    '#e91e63',
    '#9c27b0',
    '#673ab7',
    '#3f51b5',
    '#2196f3',
    '#03a9f4',
    '#00bcd4',
    '#009688',
    '#4caf50',
    '#8bc34a',
    '#cddc39',
    '#ffeb3b',
    '#ffc107',
    '#ff9800',
    '#ff5722',
    '#795548',
    '#9e9e9e',
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NewCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar,
    private questionDataService: QuestionDataService,
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      shortDescription: ['', Validators.maxLength(100)],
      icon: ['category'],
      color: ['#2196f3'],
    });
  }

  onSave(): void {
    if (this.categoryForm.valid) {
      this.isSaving = true;
      const newCategory: Omit<EvaluationCategoryDTO, 'id'> = {
        name: this.categoryForm.value.name,
        displayName: this.categoryForm.value.displayName,
        description: this.categoryForm.value.description,
        shortDescription: this.categoryForm.value.shortDescription,
        icon: this.categoryForm.value.icon,
        color: this.categoryForm.value.color,
      };

      // TODO: Backend-Service für Kategorieerstellung aufrufen
      this.questionDataService.createEvaluationCategory(newCategory).subscribe({
        next: createdCategory => {
          this.snackBar.open('Kategorie erfolgreich erstellt', 'Schließen', { duration: 3000 });
          this.dialogRef.close(createdCategory);
          this.isSaving = false;
        },
        error: error => {
          console.error('Fehler beim Erstellen der Kategorie:', error);
          this.snackBar.open('Fehler beim Erstellen der Kategorie', 'Schließen', {
            duration: 3000,
          });
          this.isSaving = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Hilfsmethode für Farbvorschau
  getContrastColor(backgroundColor: string): string {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }
}