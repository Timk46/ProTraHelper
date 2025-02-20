import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { detailedQuestionDTO, questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UmlEditorPopupComponent } from './uml-editor-popup/uml-editor-popup.component';

@Component({
  selector: 'app-edit-uml',
  templateUrl: './edit-uml.component.html',
  styleUrls: ['./edit-uml.component.scss']
})
export class EditUmlComponent implements AfterViewInit {
  private isDragging = false;
  private startX = 0;
  private startLeftWidth = 0;

  @ViewChild('question') questionField!: TinymceComponent;
  @ViewChild('expectations') expectationField!: TinymceComponent;
  @ViewChild('solution') solutionField!: TinymceComponent;

  @ViewChild('alignContainer', { static: false }) alignContainer!: ElementRef;
  @ViewChild('leftContainer', { static: false }) leftContainer!: ElementRef;
  @ViewChild('rightContainer', { static: false }) rightContainer!: ElementRef;
  @ViewChild('resizer', { static: false }) resizer!: ElementRef;

  umlForm: FormGroup;

  thisQuestionType = questionType.UML;

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
    private router: Router,
    private dialog: MatDialog

  ) {
    this.umlForm = this.fb.group({
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
      this.setupResizer();
    }, 0);
  }

  private setupResizer(): void {
    const container = this.alignContainer.nativeElement;
    const leftSide = this.leftContainer.nativeElement;
    const resizer = this.resizer.nativeElement;

    console.log(container, leftSide, resizer);
    if (!container || !leftSide || !resizer) return;

    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      this.startX = e.pageX;
      this.startLeftWidth = leftSide.offsetWidth;

      resizer.classList.add('dragging');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.pageX - this.startX;
      const newLeftWidth = ((this.startLeftWidth + deltaX) / container.offsetWidth) * 100;

      // Apply bounds (minimum 15%, maximum 85%)
      const boundedWidth = Math.min(Math.max(newLeftWidth, 15), 85);

      leftSide.style.width = `${boundedWidth}%`;
      const rightSide = this.rightContainer.nativeElement;
      if (rightSide) {
        rightSide.style.width = `${100 - boundedWidth}%`;
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
  }



  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        if (data.type === questionType.UML) {
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine UML-Aufgabe!', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.UML && this.detailedQuestionData) {
      this.umlForm.patchValue({
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
        if (submitData) {
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
    if (this.thisQuestionType === questionType.UML && this.umlForm.valid && this.detailedQuestionData) {
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.umlForm.value.questionTitle,
        level: parseInt(this.umlForm.value.questionDifficulty),
        description: this.umlForm.value.questionDescription,
        score: parseInt(this.umlForm.value.questionScore),
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


  // Task specific functions

  editUmlPrefab() {
    const dialogData = {
      width: '80vw',
      height: '80vh',
      data: {
        mode: 'prefab',
      }
    }

    this.dialog.open(UmlEditorPopupComponent, dialogData).afterClosed().subscribe(result => {
      if (result) {
        console.log('Dialog closed:', result);
      }
    });
  }

  editUmlSolution(){
    const dialogData = {
      width: '80vw',
      height: '80vh',
      data: {
        mode: 'solution',
      }
    }

    this.dialog.open(UmlEditorPopupComponent, dialogData).afterClosed().subscribe(result => {
      if (result) {
        console.log('Dialog closed:', result);
      }
    });
  }

}
