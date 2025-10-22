import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  detailedQuestionDTO,
  EvaluationCategoryDTO,
  questionType,
  uploadQuestionDTO,
} from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NewCategoryDialogComponent } from './new-category-dialog/new-category-dialog.component';

@Component({
  selector: 'app-edit-group-review-gate',
  templateUrl: './edit-group-review-gate.component.html',
  styleUrls: ['./edit-group-review-gate.component.scss'],
})
export class EditGroupReviewGateComponent {
  @ViewChild('question') questionField!: TinymceComponent;

  grgForm: FormGroup;
  thisQuestionType = questionType.GROUP_REVIEW_GATE;
  isSaving = false;
  allUploadQuestions: uploadQuestionDTO[] = [];
  allCategories: EvaluationCategoryDTO[] = [];

  // Kategorieverwaltung
  selectedCategories: EvaluationCategoryDTO[] = [];
  selectedCategoryToAdd: EvaluationCategoryDTO | null = null;
  availableCategories: EvaluationCategoryDTO[] = [];

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  };

  detailedQuestionData: detailedQuestionDTO | null = null;

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.grgForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
      linkedQuestionId: ['', Validators.required],
    });
    this.questionDataService.getAllUploadQuestions().subscribe((questions: uploadQuestionDTO[]) => {
      this.allUploadQuestions = questions;
    });
    this.questionDataService
      .getAllEvalDiscussionCategories()
      .subscribe((categories: EvaluationCategoryDTO[]) => {
        this.allCategories = categories;
        this.updateAvailableCategories();
      });
  }

  ngOnInit(): void {
    //this.handleRouteParams();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
    }, 0);
  }

  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService
        .getDetailedQuestionData(questionId, this.thisQuestionType)
        .subscribe(data => {
          if (data.type === questionType.GROUP_REVIEW_GATE) {
            this.detailedQuestionData = data;
            console.log(this.detailedQuestionData);
            this.setContent();
            console.log('All categories:', this.allCategories);
            console.log('Selected Categories:', this.selectedCategories);
          } else {
            this.snackBar.open(
              'ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Gruppenbewertungsaufgabe!',
              'Schließen',
              { duration: 10000 },
            );
            this.thisQuestionType = data.type as questionType;
          }
        });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.GROUP_REVIEW_GATE && this.detailedQuestionData) {
      this.grgForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
        linkedQuestionId: this.detailedQuestionData.groupReviewGate?.linkedQuestionId || 0,
      });

      // Lade bereits verlinkte Kategorien
      if (this.detailedQuestionData.groupReviewGate?.linkedCategories) {
        const linkedCategoriesData = JSON.parse(this.detailedQuestionData.groupReviewGate.linkedCategories as any);
        if (linkedCategoriesData && linkedCategoriesData.linkedCategoryIds) {
          this.selectedCategories = this.allCategories.filter(cat =>
            linkedCategoriesData.linkedCategoryIds.includes(cat.id),
          );
          this.updateAvailableCategories();
        }
      }

      if (this.detailedQuestionData.groupReviewGate) {
        this.questionField.setContent(
          this.detailedQuestionData.groupReviewGate.textHTML || this.detailedQuestionData.text,
        );
      }
    }
  }

  // Kategorieverwaltung Methoden
  protected addCategory(): void {
    if (
      this.selectedCategoryToAdd &&
      !this.selectedCategories.find(cat => cat.id === this.selectedCategoryToAdd!.id)
    ) {
      this.selectedCategories.push(this.selectedCategoryToAdd);
      this.updateAvailableCategories();
      this.selectedCategoryToAdd = null;
    }
  }

  protected removeCategory(category: EvaluationCategoryDTO): void {
    this.selectedCategories = this.selectedCategories.filter(cat => cat.id !== category.id);
    this.updateAvailableCategories();
  }

  protected openNewCategoryDialog(): void {
    const dialogRef = this.dialog.open(NewCategoryDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {},
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Neue Kategorie wurde erstellt
        this.allCategories.push(result);
        this.updateAvailableCategories();
        this.snackBar.open(
          'Kategorie wurde erfolgreich erstellt und ist jetzt verfügbar',
          'Schließen',
          { duration: 3000 },
        );
      }
    });
  }

  private updateAvailableCategories(): void {
    this.availableCategories = this.allCategories.filter(
      cat => !this.selectedCategories.find(selected => selected.id === cat.id),
    );
  }

  protected trackByCategory(index: number, category: EvaluationCategoryDTO): number {
    return category.id;
  }

  protected getContrastColor(backgroundColor: string): string {
    // Einfache Implementierung für Kontrast
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  protected onOverwrite() {
    this.confirmationService.confirm({
      title: 'Frage aktualisieren',
      message: 'Dies überschreibt die aktuelle Version der Frage. Fortfahren?',
      acceptLabel: 'Aktualisieren',
      declineLabel: 'Abbrechen',
      accept: () => {
        this.isSaving = true;
        const submitData = this.buildDTO();
        console.log('Submit Data:', submitData);
        if (submitData) {
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
              this.isSaving = false;
            },
            error: error => {
              console.error('Error updating question:', error);
              this.snackBar.open('Fehler beim Aktualisieren der Frage', 'Schließen', {
                duration: 3000,
              });
              this.isSaving = false;
            },
          });
        } else {
          this.isSaving = false;
        }
      },
      decline: () => {
        console.log('Overwrite declined');
      },
    });
  }

  protected onSaveNewVersion() {
    return; // disabled for now

    this.confirmationService.confirm({
      title: 'Neue Version erstellen',
      message:
        'Dies speichert die Frage unter einer neuen Version. Die alte Version bleibt erhalten, aber nicht mehr sichtbar. Fortfahren?',
      acceptLabel: 'Version erstellen',
      declineLabel: 'Abbrechen',
      accept: () => {
        //this.saveQuestion();
        console.log('Save accepted');
      },
      decline: () => {
        console.log('Save declined');
      },
    });
  }

  protected onCancel() {
    this.confirmationService.confirm({
      title: 'Bearbeitung abbrechen',
      message:
        'Dies schließt die Bearbeitung der Frage. Alle ungespeicherten Daten gehen verloren. Fortfahren?',
      acceptLabel: 'Bearbeitung abbrechen',
      declineLabel: 'Weiter bearbeiten',
      swapColors: true,
      accept: () => {
        console.log('Cancel accepted');
        this.router.navigate(['dashboard']);
      },
      decline: () => {
        console.log('Cancel declined');
      },
    });
  }

  private buildDTO(): detailedQuestionDTO | null {
    if (
      this.thisQuestionType === questionType.GROUP_REVIEW_GATE &&
      this.grgForm.valid &&
      this.detailedQuestionData
    ) {
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.grgForm.value.questionTitle,
        level: parseInt(this.grgForm.value.questionDifficulty),
        description: this.grgForm.value.questionDescription,
        score: parseInt(this.grgForm.value.questionScore),
        text: this.questionField.getRawContent(),
        groupReviewGate: {
          questionId: this.detailedQuestionData.id,
          linkedQuestionId: parseInt(this.grgForm.value.linkedQuestionId),
          textHTML: this.questionField.getContent(),
          linkedCategories:
            this.selectedCategories.length > 0
              ? {
                  gateId: this.detailedQuestionData.id,
                  linkedCategoryIds: this.selectedCategories.map(cat => cat.id),
                }
              : undefined,
        },
      };
      return newData;
    }
    return null;
  }
}