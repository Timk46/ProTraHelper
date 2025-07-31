import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { detailedQuestionDTO, questionType, uploadQuestionDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-group-review-gate',
  templateUrl: './edit-group-review-gate.component.html',
  styleUrls: ['./edit-group-review-gate.component.scss']
})
export class EditGroupReviewGateComponent {

  @ViewChild('question') questionField!: TinymceComponent;

  grgForm: FormGroup;
  thisQuestionType = questionType.GROUP_REVIEW_GATE;
  isSaving = false;
  allUploadQuestions: uploadQuestionDTO[] = [];

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
    this.grgForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
      linkedQuestionId: [0, Validators.required]
    });
    this.questionDataService.getAllUploadQuestions().subscribe((questions: uploadQuestionDTO[]) => {
      this.allUploadQuestions = questions;
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
        if (data.type === questionType.GROUP_REVIEW_GATE) { // Kommentar Sven: hab hier auch die entsprechende questionType anstelle des Strings eingefügt. Bitte testen.
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Gruppenbewertungsaufgabe!', 'Schließen', { duration: 10000 });
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
        linkedQuestionId: this.detailedQuestionData.groupReviewGate?.linkedQuestionId || 0
      });
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
    if (this.thisQuestionType === questionType.GROUP_REVIEW_GATE && this.grgForm.valid && this.detailedQuestionData){
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.grgForm.value.questionTitle,
        level: parseInt(this.grgForm.value.questionDifficulty),
        description: this.grgForm.value.questionDescription,
        score: parseInt(this.grgForm.value.questionScore),
        text: this.questionField.getRawContent(),
        groupReviewGate: {
          questionId: this.detailedQuestionData.id,
          linkedQuestionId: parseInt(this.grgForm.value.linkedQuestionId)
        }
      }
      return newData;
    }
    return null;
  }


}
