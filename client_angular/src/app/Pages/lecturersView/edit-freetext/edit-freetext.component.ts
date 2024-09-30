import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { detailedFreetextQuestionDTO, detailedQuestionDTO, questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-freetext',
  templateUrl: './edit-freetext.component.html',
  styleUrls: ['./edit-freetext.component.scss']
})
export class EditFreetextComponent {

  @ViewChild('question') questionField!: TinymceComponent;
  @ViewChild('expectations') expectationField!: TinymceComponent;
  @ViewChild('solution') solutionField!: TinymceComponent;

  freeTextForm: FormGroup;

  thisQuestionType = questionType.FREETEXT;

  isSaving = false;

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  detailedQuestionData: detailedQuestionDTO | null = null;

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private router: Router

  ) {
    this.freeTextForm = this.fb.group({
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
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        if (data.type === questionType.FREETEXT) { // Kommentar Sven: hab hier auch die entsprechende questionType anstelle des Strings eingefügt. Bitte testen.
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Freitextaufgabe!', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.FREETEXT && this.detailedQuestionData) {
      this.freeTextForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.freetextQuestion) {
        this.questionField.setContent(this.detailedQuestionData.freetextQuestion.textHTML || this.detailedQuestionData.text);
        this.expectationField.setContent(this.detailedQuestionData.freetextQuestion.expectationsHTML || this.detailedQuestionData.freetextQuestion.expectations);
        this.solutionField.setContent(this.detailedQuestionData.freetextQuestion.exampleSolutionHTML || this.detailedQuestionData.freetextQuestion.exampleSolution || '');
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
        if (submitData){
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
              this.isSaving = false
            },
            error: error => {
              console.error('Error updating question:', error);
              this.snackBar.open('Fehler beim Aktualisieren der Frage', 'Schließen', { duration: 3000 });
              this.isSaving = false;
            }
          });
        } else {
          this.isSaving = false;
        }
      },
      decline: () => {
        console.log('Overwrite declined');
      }
    });
  }

  protected onSaveNewVersion() {
    return // disabled for now

    this.confirmationService.confirm({
      title: 'Neue Version erstellen',
      message: 'Dies speichert die Frage unter einer neuen Version. Die alte Version bleibt erhalten, aber nicht mehr sichtbar. Fortfahren?',
      acceptLabel: 'Version erstellen',
      declineLabel: 'Abbrechen',
      accept: () => {
        //this.saveQuestion();
        console.log('Save accepted');
      },
      decline: () => {
        console.log('Save declined');
      }
    });
  }

  protected onCancel() {
    this.confirmationService.confirm({
      title: 'Bearbeitung abbrechen',
      message: 'Dies schließt die Bearbeitung der Frage. Alle ungespeicherten Daten gehen verloren. Fortfahren?',
      acceptLabel: 'Bearbeitung abbrechen',
      declineLabel: 'Weiter bearbeiten',
      swapColors: true,
      accept: () => {
        console.log('Cancel accepted');
        this.router.navigate(['dashboard']);
      },
      decline: () => {
        console.log('Cancel declined');
      }
    });
  }

  private buildDTO(): detailedQuestionDTO | null {
    if (this.thisQuestionType === questionType.FREETEXT && this.freeTextForm.valid && this.detailedQuestionData){
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.freeTextForm.value.questionTitle,
        level: parseInt(this.freeTextForm.value.questionDifficulty),
        description: this.freeTextForm.value.questionDescription,
        score: parseInt(this.freeTextForm.value.questionScore),
        text: this.questionField.getRawContent(),
        freetextQuestion: {
          id: this.detailedQuestionData.freetextQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          expectations: this.expectationField.getRawContent(),
          expectationsHTML: this.expectationField.getContent(),
          exampleSolution: this.solutionField.getRawContent(),
          exampleSolutionHTML: this.solutionField.getContent(),
        }
      }
      return newData;
    }
    return null;
  }
}
