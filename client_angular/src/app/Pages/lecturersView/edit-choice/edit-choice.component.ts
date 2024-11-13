import { Component, ViewChild } from "@angular/core";
import { TinymceComponent } from "../../tinymce/tinymce.component";
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { detailedChoiceOptionDTO, detailedQuestionDTO, questionType } from "@DTOs/index";
import { QuestionDataService } from "src/app/Services/question/question-data.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ConfirmationService } from "src/app/Services/confirmation/confirmation.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { McqcreationService } from "src/app/Services/mcqCreation/mcqcreation.service";
import { MatTableDataSource } from "@angular/material/table";
import { ContentService } from "src/app/Services/content/content.service";
import { ConceptNode } from "@DTOs/prisma.dto";
import { Observable, of, ReplaySubject, Subject } from "rxjs";
import { map, startWith, takeUntil } from "rxjs/operators";

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
  generationForm: FormGroup;

  conceptFilterControl = new FormControl('');

  concepts: ConceptNode[] = [];
  filteredConcepts: ReplaySubject<ConceptNode[]> = new ReplaySubject<ConceptNode[]>(1);
  dataSource: MatTableDataSource<any>;

  isGenerating: boolean[] = [];
  isQuestionGenerating = false;
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

    this.choiceForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionType: ['', Validators.required],
      questionScore: ['', Validators.required],
      questionShuffle: [false],
      //questionConcept: [''],
      optionsData: this.fb.array([]),
    });

    this.generationForm = this.fb.group({
      generationConcept: ['', Validators.required],
      generationTopic: [''], //['', Validators.required], CURRENTLY NOT IMPLEMENTED
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
        questionShuffle: this.detailedQuestionData.mcQuestion?.shuffleoptions || false,
        //questionConcept: this.detailedQuestionData.conceptNodeId || ''
      });
      this.generationForm.patchValue({
        generationConcept: this.detailedQuestionData.conceptNodeId || '',
        generationTopic: '',
        generationOptionCount: this.detailedQuestionData.mcQuestion?.mcOptions.length || 4
      });
      if (this.detailedQuestionData.mcQuestion) {
        console.log('Setting options:', this.detailedQuestionData.mcQuestion.textHTML || this.detailedQuestionData.text);
        this.questionField.setContent(this.detailedQuestionData.mcQuestion.textHTML || this.detailedQuestionData.text);
        this.optionsData.clear();
        this.detailedQuestionData.mcQuestion.mcOptions.forEach(option => {
          this.addOption(option.id, option.text, option.is_correct);
        });
      }
      if (this.detailedQuestionData.conceptNodeId) {
        this.contentService.getConcepts().subscribe(concepts => {
          this.concepts = concepts;
          this.filteredConcepts.next(this.concepts.slice());
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
        this.isSaving = true;
        const submitData = this.buildDTO();
        console.log('Submit data:', submitData);
        if (submitData){
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.detailedQuestionData = response;
              this.setContent();
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
    if ( (this.thisQuestionType === questionType.SINGLECHOICE || this.thisQuestionType === questionType.MULTIPLECHOICE) && this.choiceForm.valid && this.detailedQuestionData){
      const newData: detailedQuestionDTO = {
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

  get generationBasis(): FormControl {
    return this.choiceForm.get('generationBasis') as FormControl;
  }

  get correctOptionsCount(): number {
    return this.optionsData.value.filter((option: {id: number, text: string, is_correct: boolean}) => option.is_correct).length;
  }

  getConceptById(id: number): string {
    return this.concepts.find(concept => concept.id === id)?.name || '';
  }

  onSelectClick() {
    this.filterConcepts();
  }

  private filterConcepts() {
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
    console.log(this.optionsData);
    this.updateTableData();
  }

  generateOption(index: number): void {
    console.log('Generating option', index, 'concept:', this.generationForm.value.generationConcept, this.getConceptById(Number(this.generationForm.value.generationConcept)));
    this.isGenerating[index] = true;

    // Get the current option with text and correctness
    const currentOption = {
      text: this.optionsData.at(index).get('text')!.value || '',
      correct: this.optionsData.at(index).get('is_correct')!.value || false
    };

    // Get other options with text and correctness
    const otherOptions = this.optionsData.value
      .filter((_: any, i: number) => i !== index) // Exclude the current option
      .map((option: { id: number; text: string; is_correct: boolean }) => ({
        text: option.text,
        correct: option.is_correct
      }));

    this.mcqService.getAnswer(
      this.questionField.getRawContent(),
      currentOption,
      otherOptions,
      this.getConceptById(Number(this.generationForm.value.generationConcept))
    ).subscribe((answer: Answer) => {
      this.optionsData.at(index).get('id')!.setValue("-1");
      this.optionsData.at(index).get('text')!.setValue(answer.answer);
      this.optionsData.at(index).get('is_correct')!.setValue(answer.correct);
      console.log('Generated answer:', answer);
      this.isGenerating[index] = false;
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
      this.generationForm.value.generationTopic
    ).subscribe(data => {
      console.log('Generated question:', data);
      this.questionField.setContent(data.question || '');
      this.generationForm.get('generationTopic')?.setValue(data.description || '');
      this.optionsData.clear();
      if (data.answers) {
        data.answers.forEach((answer: Answer) => {
          this.addOption(-1, answer.answer, answer.correct);
        });
      }
      this.resetLoadingIndicators();
    });
    console.log('generate question clicked');
  }

  deleteOption(index: number): void {
    this.optionsData.removeAt(index);
    this.updateTableData();
  }

  updateTableData(): void {
    this.dataSource.data = this.optionsData.controls;
  }

  private resetLoadingIndicators(): void {
    this.isGenerating = [];
    this.isQuestionGenerating = false;
  }
}
