import { Component, ViewChild } from "@angular/core";
import { TinymceComponent } from "../../tinymce/tinymce.component";
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { detailedChoiceOptionDTO, detailedQuestionDTO, questionType } from "@DTOs/index";
import { QuestionDataService } from "src/app/Services/question/question-data.service";
import { ActivatedRoute } from "@angular/router";
import { ConfirmationService } from "src/app/Services/confirmation/confirmation.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { McqcreationService } from "src/app/Services/mcqCreation/mcqcreation.service";
import { MatTableDataSource } from "@angular/material/table";

interface Answer {
  answer?: string;
  correct?: boolean;
}


@Component({
  selector: 'app-edit-choice',
  templateUrl: './edit-choice.component.html',
  styleUrls: ['./edit-choice.component.scss']
})
export class EditChoiceComponent {

  @ViewChild('question') questionField!: TinymceComponent;

  choiceForm: FormGroup;
  dataSource: MatTableDataSource<any>;

  thisQuestionType = questionType.SINGLECHOICE;
  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }
  detailedQuestionData: detailedQuestionDTO | null = null;

  displayedColumns: string[] = ['option', 'correct', 'action'];


  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private mcqService: McqcreationService

  ) {
    this.dataSource = new MatTableDataSource<any>([]);

    this.choiceForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionType: ['', Validators.required],
      questionScore: ['', Validators.required],
      questionShuffle: [false],
      optionsData: this.fb.array([]),
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
        this.thisQuestionType = data.type as questionType;
        if (data.type === questionType.SINGLECHOICE || data.type === questionType.MULTIPLECHOICE) { // Kommentar Sven: hab hier auch die entsprechende questionType anstelle des Strings eingefügt. Bitte testen.
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Multiple/Single Choice Aufgabe!', 'Schließen', { duration: 10000 });
        }
      });
    });
  }

  private setContent() {
    console.log('Setting content', this.detailedQuestionData);
    if ( (this.thisQuestionType === questionType.SINGLECHOICE || this.thisQuestionType === questionType.MULTIPLECHOICE ) && this.detailedQuestionData) {
      this.choiceForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionType: this.thisQuestionType,
        questionScore: this.detailedQuestionData.score,
        questionShuffle: this.detailedQuestionData.mcQuestion?.shuffleoptions || false
      });
      if (this.detailedQuestionData.mcQuestion) {
        console.log('Setting options:', this.detailedQuestionData.mcQuestion.textHTML || this.detailedQuestionData.text);
        this.questionField.setContent(this.detailedQuestionData.mcQuestion.textHTML || this.detailedQuestionData.text);
        this.optionsData.clear();
        this.detailedQuestionData.mcQuestion.mcOptions.forEach(option => {
          this.addOption(option.id, option.text, option.is_correct);
        });
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

  private buildDTO(): detailedQuestionDTO | null {
    if ( (this.thisQuestionType === questionType.SINGLECHOICE || this.thisQuestionType === questionType.MULTIPLECHOICE) && this.choiceForm.valid && this.detailedQuestionData){
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.choiceForm.value.questionTitle,
        level: parseInt(this.choiceForm.value.questionDifficulty),
        type: this.choiceForm.value.questionType,
        description: this.choiceForm.value.questionDescription,
        score: parseInt(this.choiceForm.value.questionScore),
        text: this.questionField.getRawContent(),
        mcQuestion: {
          id: this.detailedQuestionData.mcQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          shuffleoptions: false,
          isSC: this.thisQuestionType === questionType.SINGLECHOICE,
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
    }
    return null;
  }

  //-----

  get optionsData(): FormArray {
    return this.choiceForm.get('optionsData') as FormArray;
  }

  addOption(id: number = -1, text: string = '', isCorrect: boolean = false): void {
    const optionGroup = this.fb.group({
      id: [id],
      text: [text, Validators.required],
      is_correct: [isCorrect]
    });
    this.optionsData.push(optionGroup);
    console.log(this.optionsData);
    this.updateTableData();
  }

  generateOption(index: number): void {
    // TODO: Implement
  }

  deleteOption(index: number): void {
    this.optionsData.removeAt(index);
    this.updateTableData();
  }

  updateTableData(): void {
    this.dataSource.data = this.optionsData.controls;
  }
}
