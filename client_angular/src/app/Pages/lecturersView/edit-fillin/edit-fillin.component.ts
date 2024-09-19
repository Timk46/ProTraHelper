import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { detailedQuestionDTO, questionType } from '@DTOs/index';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Component({
  selector: 'app-edit-fillin',
  templateUrl: './edit-fillin.component.html',
  styleUrls: ['./edit-fillin.component.scss']
})
export class EditFillinComponent {

  fillinForm: FormGroup;
  thisQuestionType = questionType.FILLIN;
  detailedQuestionData: detailedQuestionDTO | null = null;

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,

  ) {
    this.fillinForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionType: ['', Validators.required],
      questionScore: ['', Validators.required],
      questionShuffle: [false],
      questionConcept: [''],
      optionsData: this.fb.array([]),
    });
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
        if (data.type === questionType.FILLIN) {
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Lückentextaufgabe', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.FILLIN && this.detailedQuestionData) {
      this.fillinForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.freetextQuestion) {
        // TODO: restliche Felder fuellen
      }
    }
  }

  private buildDTO(): detailedQuestionDTO | null {
    /* if ( this.thisQuestionType === questionType.FILLIN && this.choiceForm.valid && this.detailedQuestionData){
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.choiceForm.value.questionTitle,
        level: parseInt(this.choiceForm.value.questionDifficulty),
        type: this.choiceForm.value.questionType,
        description: this.choiceForm.value.questionDescription,
        score: parseInt(this.choiceForm.value.questionScore),
        text: this.questionField.getRawContent(),
        conceptNodeId: parseInt(this.choiceForm.value.questionConcept) || undefined,
        mcQuestion: {
          id: this.detailedQuestionData.mcQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          shuffleoptions: false,
          isSC: this.choiceForm.value.questionType === questionType.SINGLECHOICE,
          mcOptions: this.optionsData.value.map((option: {id: number, text: string, is_correct: boolean}) => {
            console.log('Option:', option.id);
            return {
              id: option.id,
              text: option.text,
              is_correct: option.is_correct
            }
          })
        }
      }
      return newData;
    } */
    return null;
  }

  protected onOverwrite() {
    this.confirmationService.confirm({
      title: 'Frage aktualisieren',
      message: 'Dies überschreibt die aktuelle Version der Frage. Fortfahren?',
      acceptLabel: 'Aktualisieren',
      declineLabel: 'Abbrechen',
      accept: () => {
        const submitData = this.buildDTO();
        console.log('Submit data:', submitData);
        if (submitData){
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.detailedQuestionData = response;
              this.setContent();
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
            },
            error: error => {
              console.error('Error updating question:', error);
              this.snackBar.open('Fehler beim Aktualisieren der Frage', 'Schließen', { duration: 3000 });
            }
          });
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
      accept: () => {
        //this.saveQuestion();
        console.log('Cancel accepted');
      },
      decline: () => {
        console.log('Cancel declined');
      }
    });
  }

  // ----------------- Freetext specific methods -----------------



}
