import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { detailedQuestionDTO, questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';

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

  thisQuestionType = questionType.CODE;

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  detailedQuestionData: detailedQuestionDTO = {
    id: -1,
    name: '',
    description: '',
    score: 0,
    type: 'FreeText',
    level: 1,
    mode: 'practise',
    authorId: -1,
    text: '',
    isApproved: false,
    version: 1,
    originId: -1,
  };

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,

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
          this.detailedQuestionData.type = data.type;
        }
      });
    });
  }

  private setContent() {
    if (this.detailedQuestionData.freetextQuestion){
      this.freeTextForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      this.questionField.setContent(this.detailedQuestionData.freetextQuestion.textHTML || this.detailedQuestionData.text);
      this.expectationField.setContent(this.detailedQuestionData.freetextQuestion.expectationsHTML || this.detailedQuestionData.freetextQuestion.expectations);
      this.solutionField.setContent(this.detailedQuestionData.freetextQuestion.exampleSolutionHTML || this.detailedQuestionData.freetextQuestion.exampleSolution || '');
    }

  }


  protected onOverwrite() {
    this.confirmationService.confirm({
      title: 'Frage aktualisieren',
      message: 'Dies überschreibt die aktuelle Version der Frage. Fortfahren?',
      acceptLabel: 'Aktualisieren',
      declineLabel: 'Abbrechen',
      accept: () => {
        //this.saveQuestion();
        console.log('Overwrite accepted');
      },
      decline: () => {
        console.log('Overwrite declined');
      }
    });
    if (this.detailedQuestionData.type === 'FreeText'){
      //
    }
  }

  protected onSaveNewVersion() {
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
        console.log('Save accepted');
      },
      decline: () => {
        console.log('Save declined');
      }
    });
  }
}
