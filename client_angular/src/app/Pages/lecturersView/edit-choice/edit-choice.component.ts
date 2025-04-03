import { Component, ViewChild } from "@angular/core";
import { TinymceComponent } from "../../tinymce/tinymce.component";
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { detailedChoiceOptionDTO, detailedQuestionDTO, questionType } from "@DTOs/index";
import { QuestionDataService } from "src/app/Services/question/question-data.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ConfirmationService } from "src/app/Services/confirmation/confirmation.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { McqcreationService } from "src/app/Services/mcqCreation/mcqcreation.service";
import { MatTableDataSource } from "@angular/material/table";
import { ContentService } from "src/app/Services/content/content.service";
import { ConceptNode } from "@DTOs/index";
import { Observable, of, ReplaySubject, Subject } from "rxjs";
import { map, startWith, takeUntil } from "rxjs/operators";
import { Answer, McqEvaluation, McqEvaluations } from "src/app/Services/mcqCreation/mcqcreation.types";

@Component({
  selector: 'app-edit-choice',
  templateUrl: './edit-choice.component.html',
  styleUrls: ['./edit-choice.component.scss']
})
export class EditChoiceComponent {
  @ViewChild('question') questionField!: TinymceComponent;

  choiceForm: FormGroup;
  generationForm: FormGroup;
  additionalInfoForm: FormGroup;

  conceptFilterControl = new FormControl('');

  concepts: ConceptNode[] = [];
  filteredConcepts: ReplaySubject<ConceptNode[]> = new ReplaySubject<ConceptNode[]>(1);
  dataSource: MatTableDataSource<any>;
  additionalInfoDataSource: MatTableDataSource<any>;

  isGenerating: boolean[] = [];
  isQuestionGenerating = false;
  isEvaluating = false;
  isSaving = false;

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
  additionalInfoColumns: string[] = ['info', 'action'];

  private _onDestroy = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private mcqService: McqcreationService,
    private contentService: ContentService,
    private router: Router
  ) {
    this.dataSource = new MatTableDataSource<any>([]);
    this.additionalInfoDataSource = new MatTableDataSource<any>([]);

    this.choiceForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionType: ['', Validators.required],
      questionScore: ['', Validators.required],
      questionShuffle: [false],
      optionsData: this.fb.array([]),
    });

    this.additionalInfoForm = this.fb.group({
      additionalInfoData: this.fb.array([])
    });

    this.generationForm = this.fb.group({
      generationConcept: ['', Validators.required],
      generationTopic: [''],
      generationOptionCount: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.filteredConcepts.next(this.concepts.slice());
    this.conceptFilterControl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterConcepts();
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
    }, 0);
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  get optionsData(): FormArray {
    return this.choiceForm.get('optionsData') as FormArray;
  }

  get additionalInfoData(): FormArray {
    return this.additionalInfoForm.get('additionalInfoData') as FormArray;
  }

  get correctOptionsCount(): number {
    return this.optionsData.value.filter((option: { id: number, text: string, is_correct: boolean }) => option.is_correct).length;
  }

  onSelectClick(): void {
    this.filterConcepts();
  }

  private filterConcepts(): void {
    if (!this.concepts) {
      return;
    }
    let search = this.conceptFilterControl.value;
    if (!search) {
      this.filteredConcepts.next(this.concepts.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredConcepts.next(
      this.concepts.filter(concept => concept.name.toLowerCase().indexOf(search!) > -1)
    );
  }

  addOption(id: number = -1, text: string = '', isCorrect: boolean = false): void {
    const optionGroup = this.fb.group({
      id: [id],
      text: [text, Validators.required],
      is_correct: [isCorrect]
    });
    this.optionsData.push(optionGroup);
    this.updateTableData();
  }

  deleteOption(index: number): void {
    this.optionsData.removeAt(index);
    this.updateTableData();
  }

  addAdditionalInfo(text: string = '', correct: boolean = false): void {
    const infoGroup = this.fb.group({
      text: [text, Validators.required],
      correct: [{value: correct, disabled: true}]
    });
    this.additionalInfoData.push(infoGroup);
    this.updateAdditionalInfoTableData();
  }

  private updateTableData(): void {
    this.dataSource.data = this.optionsData.controls;
  }

  private updateAdditionalInfoTableData(): void {
    this.additionalInfoDataSource.data = this.additionalInfoData.controls;
  }

  generateOption(index: number): void {
    console.log('Generating option', index);
    this.isGenerating[index] = true;

    const currentOption = {
      answer: this.optionsData.at(index).get('text')!.value || '',
      correct: this.optionsData.at(index).get('is_correct')!.value || false
    };

    const otherOptions = this.optionsData.value
      .filter((_: any, i: number) => i !== index)
      .map((option: { id: number; text: string; is_correct: boolean }) => ({
        answer: option.text,
        correct: option.is_correct
      }));

    this.mcqService.getAnswer(
      this.questionField.getRawContent(),
      currentOption,
      otherOptions,
      this.getConceptById(Number(this.generationForm.value.generationConcept))
    ).subscribe({
      next: (answer: Answer) => {
        this.optionsData.at(index).get('id')!.setValue("-1");
        this.optionsData.at(index).get('text')!.setValue(answer.answer);
        this.optionsData.at(index).get('is_correct')!.setValue(answer.correct);
        this.isGenerating[index] = false;
      },
      error: (error) => {
        console.error('Error generating option:', error);
        this.isGenerating[index] = false;
        this.snackBar.open('Fehler beim Generieren der Option', 'Schließen', { duration: 3000 });
      }
    });
  }

  generateQuestion(): void {
    if (this.generationForm.invalid) {
      this.generationForm.markAllAsTouched();
      return;
    }

    this.isQuestionGenerating = true;
    this.mcqService.getQuestionAndAnswers(
      this.getConceptById(Number(this.generationForm.value.generationConcept)),
      this.generationForm.value.generationOptionCount,
    ).subscribe({
      next: (data) => {
        console.log('Generated question:', data);
        this.questionField.setContent(data.question || '');
        this.optionsData.clear();
        if (data.answers) {
          data.answers.forEach((answer: Answer) => {
            this.addOption(-1, answer.answer, answer.correct);
          });
        }
      },
      error: (error) => {
        console.error('Error generating question:', error);
        this.snackBar.open('Fehler beim Generieren der Frage', 'Schließen', { duration: 3000 });
      },
      complete: () => {
        this.resetLoadingIndicators();
      }
    });
  }

  private resetLoadingIndicators(): void {
    this.isGenerating = [];
    this.isQuestionGenerating = false;
  }

  getConceptById(id: number): string {
    return this.concepts.find(concept => concept.id === id)?.name || '';
  }

  applyEvaluation(): void {
    const additionalInfoControls = this.additionalInfoData.controls;
    const optionsControls = this.optionsData.controls;

    if (additionalInfoControls.length === optionsControls.length) {
      additionalInfoControls.forEach((infoControl: AbstractControl, index: number) => {
        const correct = (infoControl as FormGroup).getRawValue().correct;
        const optionControl = optionsControls[index] as FormGroup;
        optionControl.get('is_correct')?.setValue(correct);
      });

      this.snackBar.open('Bewertungen wurden übernommen', 'Schließen', { duration: 3000 });
    } else {
      this.snackBar.open('Anzahl der Optionen und Begründungen stimmt nicht überein', 'Schließen', { duration: 3000 });
    }
  }

  evaluate(): void {
    const title = this.questionField.getRawContent();
    const answers = this.optionsData.controls
      .map((control: AbstractControl) => (control as FormGroup).get('text')?.value)
      .filter((text: string | null | undefined) => text);

    if (title && answers.length > 0) {
      this.isEvaluating = true;
      this.additionalInfoData.clear();

      this.mcqService.getEvaluation(title, answers).subscribe({
        next: (evalData: McqEvaluations) => {
          if (evalData.evaluations) {
            evalData.evaluations.forEach((evaluation: McqEvaluation, index: number) => {
              if (evaluation.reasoning) {
                this.addAdditionalInfo(
                  `${evaluation.reasoning}`,
                  evaluation.correct || false
                );
              }
            });
          }
          this.isEvaluating = false;
        },
        error: (error: any) => {
          console.error('Error evaluating answers:', error);
          this.snackBar.open('Fehler beim Bewerten der Antworten', 'Schließen', { duration: 3000 });
          this.isEvaluating = false;
        }
      });
    } else {
      this.snackBar.open('Bitte geben Sie eine Frage und mindestens eine Antwortoption ein', 'Schließen', { duration: 3000 });
    }
  }

  onOverwrite(): void {
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
              this.detailedQuestionData = response;
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
              this.isSaving = false;
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
      }
    });
  }

  onSaveNewVersion(): void {
    return; // disabled for now
  }

  onCancel(): void {
    this.confirmationService.confirm({
      title: 'Bearbeitung abbrechen',
      message: 'Dies schließt die Bearbeitung der Frage. Alle ungespeicherten Daten gehen verloren. Fortfahren?',
      acceptLabel: 'Bearbeitung abbrechen',
      declineLabel: 'Weiter bearbeiten',
      swapColors: true,
      accept: () => {
        this.router.navigate(['dashboard']);
      }
    });
  }

  private buildDTO(): detailedQuestionDTO | null {
    if ((this.thisQuestionType === questionType.SINGLECHOICE || this.thisQuestionType === questionType.MULTIPLECHOICE) && this.choiceForm.valid && this.detailedQuestionData) {
      return {
        ...this.detailedQuestionData,
        name: this.choiceForm.value.questionTitle,
        level: parseInt(this.choiceForm.value.questionDifficulty),
        type: this.choiceForm.value.questionType,
        description: this.choiceForm.value.questionDescription,
        score: parseInt(this.choiceForm.value.questionScore),
        text: this.questionField.getRawContent(),
        conceptNodeId: parseInt(this.generationForm.value.generationConcept) || undefined,
        mcQuestion: {
          id: this.detailedQuestionData.mcQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          shuffleoptions: false,
          isSC: this.choiceForm.value.questionType === questionType.SINGLECHOICE,
          mcOptions: this.optionsData.value.map((option: { id: number, text: string, is_correct: boolean }) => ({
            id: option.id,
            text: option.text,
            is_correct: option.is_correct
          })),
          additionalInfo: this.additionalInfoData.value.map((info: { text: string, correct: boolean }) => info.text) || []
        }
      };
    }
    return null;
  }

  private handleRouteParams(): void {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        this.thisQuestionType = data.type as questionType;
        if (data.type === questionType.SINGLECHOICE || data.type === questionType.MULTIPLECHOICE) {
          this.detailedQuestionData = data;
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Multiple/Single Choice Aufgabe!', 'Schließen', { duration: 10000 });
        }
      });
    });
  }

  private setContent(): void {
    if ((this.thisQuestionType === questionType.SINGLECHOICE || this.thisQuestionType === questionType.MULTIPLECHOICE) && this.detailedQuestionData) {
      this.choiceForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionType: this.thisQuestionType,
        questionScore: this.detailedQuestionData.score,
        questionShuffle: this.detailedQuestionData.mcQuestion?.shuffleoptions || false,
      });

      this.generationForm.patchValue({
        generationConcept: this.detailedQuestionData.conceptNodeId || '',
        generationTopic: '',
        generationOptionCount: this.detailedQuestionData.mcQuestion?.mcOptions.length || 4
      });

      if (this.detailedQuestionData.mcQuestion) {
        this.questionField.setContent(this.detailedQuestionData.mcQuestion.textHTML || this.detailedQuestionData.text);

        this.optionsData.clear();
        this.detailedQuestionData.mcQuestion.mcOptions.forEach(option => {
          this.addOption(option.id, option.text, option.is_correct);
        });

        this.additionalInfoData.clear();
        if (this.detailedQuestionData.mcQuestion.additionalInfo) {
          this.detailedQuestionData.mcQuestion.additionalInfo.forEach(info => {
            this.addAdditionalInfo(info);
          });
        }
      }

      if (this.detailedQuestionData.conceptNodeId) {
        this.contentService.getConcepts().subscribe(concepts => {
          this.concepts = concepts;
          this.filteredConcepts.next(this.concepts.slice());
        });
      }
    }
  }
}
