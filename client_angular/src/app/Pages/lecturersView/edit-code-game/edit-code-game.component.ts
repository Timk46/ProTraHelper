import {Component, OnInit, QueryList, ViewChildren} from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { QuestionDataService } from "../../../Services/question/question-data.service";
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatSelectChange } from "@angular/material/select";
import { MatDialog } from "@angular/material/dialog";
import { CodeEditorComponent } from "../../../Modules/code-game/sites/code-editor/code-editor.component";
import { CodeGameScaffoldDto, questionType } from "@DTOs/question.dto";
import { CodeGameConfirmDialogComponent } from "./code-game-confirm-dialog.component";
import { CodeGameAddElementModalComponent } from "./code-game-add-element-modal.component";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: 'app-edit-code-game',
  templateUrl: './edit-code-game.component.html',
  styleUrls: ['./edit-code-game.component.scss']
})
export class EditCodeGameComponent implements OnInit {
  @ViewChildren(CodeEditorComponent) codeEditors!: QueryList<CodeEditorComponent>;

  codeGameForm: FormGroup;
  thisQuestionType = questionType.CODEGAME;
  questionData: detailedQuestionDTO | null = null;
  showTaskPreview = false;
  markdownLanguage = 'markdown';
  txtLanguage = 'txt';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private questionDataService: QuestionDataService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.codeGameForm = this.createForm();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      if (questionId) {
        this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
          this.questionData = data;
          console.log('Question data:', this.questionData);

          if (!this.questionData.codeGameQuestion) {
            this.questionData.codeGameQuestion = {
              id: 0,
              text: '',
              mainFileName: '',
              programmingLanguage: 'cpp', // default code language
              codeGameScaffolds: [],
              gameFileName: 'game.grid.txt',
              game: '',
            };
          }

          this.populateForm();
        });
      }
    });
  }

  populateForm() {
    console.log('Populating form with data:', this.questionData);

    if (this.questionData) {
      this.codeGameForm.patchValue({
        name: this.questionData.name || '',
        text: this.questionData.text || '',
        mainFileName: this.questionData.codeGameQuestion?.mainFileName || '',
        programmingLanguage: this.questionData.codeGameQuestion?.programmingLanguage || '',
        game: this.questionData.codeGameQuestion?.game || '',
        level: this.questionData.level || '',
        isApproved: this.questionData.isApproved || false,
      });

      if (this.questionData.codeGameQuestion) {
        this.populateCodeGameScaffolds();
      }
    }
  }

  populateCodeGameScaffolds() {
    const codeGameScaffoldsFormArray = this.codeGameForm.get('codeGameScaffolds') as FormArray;
    codeGameScaffoldsFormArray.clear();
    this.questionData?.codeGameQuestion!.codeGameScaffolds.forEach((codeGameScaffold: CodeGameScaffoldDto) => {
      codeGameScaffoldsFormArray.push(this.formBuilder.group({
        id: codeGameScaffold.id,
        codeFileName: codeGameScaffold.codeFileName,
        code: codeGameScaffold.code
      }));
    });
  }

  createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', Validators.required],
      programmingLanguage: ['', Validators.required],
      text: ['', Validators.required],
      codeGameScaffolds: this.formBuilder.array([]),
      mainFileName: [''],
      gameFileName: ['game.grid.txt'],
      game: [''],
      isApproved: [false],
      level: ['', Validators.required]
    });
  }

  togglePreview() {
    this.showTaskPreview = !this.showTaskPreview;
  }

  get codeGameScaffoldsControls() {
    return (this.codeGameForm.get('codeGameScaffolds') as FormArray).controls;
  }

  onCodeChange(newCode: string, index: number, type: 'codeGameScaffolds' | 'text' | 'game') {
    if (type === 'text') {
      this.codeGameForm.patchValue({ [type]: newCode });
      if (this.questionData) {
        this.questionData.text = newCode;
      }
    } else if (type === 'game') {
      this.codeGameForm.patchValue({ [type]: newCode });
      if (this.questionData && this.questionData.codeGameQuestion) {
        this.questionData.codeGameQuestion.game = newCode;
      }
    } else {
      const formArray = this.codeGameForm.get(type) as FormArray;
      const control = formArray.at(index);
      if (control) {
        control.patchValue({ code: newCode });
        if (this.questionData && this.questionData.codeGameQuestion) {
          const questionDataArray = this.questionData.codeGameQuestion[type];
          if (Array.isArray(questionDataArray) && questionDataArray[index]) {
            questionDataArray[index].code = newCode;
          }
        }
      }
    }
  }

  openAddModal(type: 'codeGameScaffolds') {
    const dialogRef = this.dialog.open(CodeGameAddElementModalComponent, {
      width: '500px',
      data: { type: type }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addElement(type, result);
      }
    });
  }

  addElement(type: 'codeGameScaffolds', data: any) {
    const formArray = this.codeGameForm.get(type) as FormArray;
    const newElement = this.formBuilder.group({
      id: 0,
      ['codeFileName']: data.fileName,
      code: data.code
    });
    formArray.push(newElement);

    if (this.questionData && this.questionData.codeGameQuestion) {
      const questionDataArray = this.questionData.codeGameQuestion[type];
      if (Array.isArray(questionDataArray)) {
        let newItem;
        switch (type) {
          case 'codeGameScaffolds':
            newItem = {
              id: 0,
              codeFileName: data.fileName,
              code: data.code,
              codeGameQuestionId: this.questionData.codeGameQuestion.id,
              language: this.questionData.codeGameQuestion.programmingLanguage
            } as CodeGameScaffoldDto;
            (questionDataArray as CodeGameScaffoldDto[]).push(newItem);
            break;
        }
      }
    }
  }

  onLanguageChange(event: MatSelectChange) {
    const newLanguage = event.value;
    console.log('Language changed to:', newLanguage);

    // Update the language for all code editors except the first one (task description) and the last one (game)
    this.updateCodeEditorsLanguage(newLanguage);
  }

  // Helper method to update all code editors with the new language
  private updateCodeEditorsLanguage(newLanguage: string) {
    const editors = this.codeEditors.toArray();
    const lastIndex = editors.length - 1;

    editors.forEach((editor, index) => {
      // Ensure the first editor (task description) always use Markdown
      if (index === 0) {
        // Ensure the first editor (task description) always use Markdown
        editor.changeLanguage(this.markdownLanguage);
      } else if (index === lastIndex) {
        // Ensure the last editor (game) always use plain text
        editor.changeLanguage(this.txtLanguage);
      } else {
        editor.changeLanguage(newLanguage);
      }
    });

    // Trigger change detection for the entire form
    this.codeGameForm.updateValueAndValidity();
  }

  confirmDelete(type: 'codeGameScaffolds', index: number, fileName: string) {
    const dialogRef = this.dialog.open(CodeGameConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Bestätigung',
        message: `Möchten Sie wirklich "${fileName}" löschen?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteElement(type, index);
      }
    });
  }

  deleteElement(type: 'codeGameScaffolds', index: number) {
    const formArray = this.codeGameForm.get(type) as FormArray;
    formArray.removeAt(index);

    if (this.questionData && this.questionData.codeGameQuestion) {
      const questionDataArray = this.questionData.codeGameQuestion[type];
      if (Array.isArray(questionDataArray)) {
        questionDataArray.splice(index, 1);
      }
    }
  }

  // TODO: import/export

  getFieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      programmingLanguage: 'Programmiersprache',
      text: 'Aufgabentext',
      level: 'Schwierigkeitsgrad'
    };
    return displayNames[field] || field;
  }

  // TODO: need to test
  getMissingFields(): string[] {
    const missingFields: string[] = [];
    const requiredFields = ['name', 'programmingLanguage', 'mainFileName', 'text', 'game'];

    for (const field of requiredFields) {
      if (this.codeGameForm.get(field)?.invalid) {
        missingFields.push(this.getFieldDisplayName(field));
      }
    }

    const codeGameScaffolds = this.codeGameForm.get('codeGameScaffolds') as FormArray;

    if (codeGameScaffolds.length === 0) {
      missingFields.push('Code-Gerüste');
    }

    return missingFields;
  }

  onSubmit() {
    if (this.codeGameForm.valid && this.questionData) {
      const updatedQuestion: detailedQuestionDTO = {
        ...this.questionData,
        name: this.codeGameForm.value.name,
        text: this.codeGameForm.value.text,
        isApproved: this.codeGameForm.value.isApproved,
        level: this.codeGameForm.value.level,
        codeGameQuestion: {
          ...this.questionData.codeGameQuestion,
          id: this.questionData.codeGameQuestion!.id,
          text: this.codeGameForm.value.text,
          mainFileName: this.codeGameForm.value.mainFileName,
          programmingLanguage: this.codeGameForm.value.programmingLanguage,
          codeGameScaffolds: this.questionData.codeGameQuestion!.codeGameScaffolds,
          gameFileName: "game.grid.txt", // Hardcoded for every game task
          game: this.codeGameForm.value.game
        }
      };

      this.questionDataService.updateWholeQuestion(updatedQuestion).subscribe(
        response => {
          console.log('Question updated successfully:', response);
          this.snackBar.open('Question updated successfully', 'Close', { duration: 3000 });
        },
        error => {
          console.error('Error updating question:', error);
          this.snackBar.open('Error updating question', 'Close', { duration: 3000 });
        }
      );
    } else {
      const missingFields = this.getMissingFields();
      const errorMessage = `Bitte füllen Sie alle erforderlichen Felder aus: ${missingFields.join(', ')}`;
      this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
    }
  }
}
