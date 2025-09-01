import { Component, ViewChild } from '@angular/core';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ContentElementDTO,
  ContentViewDTO,
  ContentViewInformationDTO,
  detailedQuestionCollectionLinkDTO,
  detailedQuestionDTO,
  questionType,
} from '@DTOs/index';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from '../../../Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContentService } from '../../../Services/content/content.service';

@Component({
  selector: 'app-edit-collection',
  templateUrl: './edit-collection.component.html',
  styleUrl: './edit-collection.component.scss',
})
export class EditCollectionComponent {
  @ViewChild('introduction') introductionField!: TinymceComponent;

  questionForm: FormGroup;

  thisQuestionType = questionType.COLLECTION;

  isSaving = false;

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  };

  contentNodeId: number | null = null;
  detailedQuestionData: detailedQuestionDTO | null = null;
  contentViews: ContentViewInformationDTO[] = [];
  collectionLinks: detailedQuestionCollectionLinkDTO[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly questionDataService: QuestionDataService,
    private readonly contentService: ContentService,
    private readonly route: ActivatedRoute,
    private readonly confirmationService: ConfirmationService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {
    this.questionForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
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
      this.contentNodeId = parseInt(params['contentNodeId']);

      this.questionDataService
        .getDetailedQuestionData(questionId, this.thisQuestionType)
        .subscribe(data => {
          if (data.type === questionType.COLLECTION) {
            this.detailedQuestionData = data;
            console.log(this.detailedQuestionData);
            this.setContent();
          } else {
            this.snackBar.open(
              'ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Sammlung!',
              'Schließen',
              { duration: 10000 },
            );
            this.thisQuestionType = data.type as questionType;
          }
        });
      this.contentService.getContentViews(this.contentNodeId).subscribe(elements => {
        this.contentViews = elements;
        console.log('Ma boy content views for', this.contentNodeId, ':', this.contentViews);
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.COLLECTION && this.detailedQuestionData) {
      this.questionForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.questionCollection) {
        this.introductionField.setContent(
          this.detailedQuestionData.questionCollection.textHTML || this.detailedQuestionData.text,
        );
        this.collectionLinks = this.detailedQuestionData.questionCollection.links || [];
      }
    }
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
      this.thisQuestionType === questionType.COLLECTION &&
      this.questionForm.valid &&
      this.detailedQuestionData
    ) {
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.questionForm.value.questionTitle,
        level: parseInt(this.questionForm.value.questionDifficulty),
        description: this.questionForm.value.questionDescription,
        score: parseInt(this.questionForm.value.questionScore),
        text: this.introductionField.getRawContent(),
        questionCollection: {
          id: this.detailedQuestionData.questionCollection?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.introductionField.getContent(),
          links: this.detailedQuestionData.questionCollection?.links || [],
        },
      };
      return newData;
    }
    return null;
  }
}
