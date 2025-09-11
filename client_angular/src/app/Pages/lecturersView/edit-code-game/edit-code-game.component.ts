import { OnInit, QueryList, Component, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { detailedQuestionDTO } from '@DTOs/index';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { CodeEditorComponent } from '../../../Modules/code-game/sites/code-editor/code-editor.component';
import { CodeGameScaffoldDto } from '@DTOs/index';
import { questionType } from '@DTOs/index';
import { CodeGameConfirmDialogComponent } from './code-game-confirm-dialog.component';
import { CodeGameAddElementModalComponent } from './code-game-add-element-modal.component';
import { DefaultCodeGameScaffoldsDTO, CodeGameScaffoldDTO } from '@DTOs/index';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import defaultScaffolds from './defaultCodeGameScaffolds.json';

@Component({
  selector: 'app-edit-code-game',
  templateUrl: './edit-code-game.component.html',
  styleUrls: ['./edit-code-game.component.scss'],
})
export class EditCodeGameComponent implements OnInit {
  @ViewChildren(CodeEditorComponent) codeEditors!: QueryList<CodeEditorComponent>;

  exportGameDataForPlayfieldEditor: any = null;

  codeGameForm: FormGroup;
  thisQuestionType = questionType.CODEGAME;
  questionData: detailedQuestionDTO | null = null;
  questionLoaded = false;
  showTaskPreview = false;
  markdownLanguage = 'markdown';
  importingTask = false;

  defaultCodeGameScaffolds: DefaultCodeGameScaffoldsDTO = defaultScaffolds;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly questionDataService: QuestionDataService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {
    this.codeGameForm = this.createForm();

    // Watch for changes in the programming language and update codeGameScaffolds if empty
    this.codeGameForm.get('programmingLanguage')?.valueChanges.subscribe(language => {
      const codeGameScaffolds = this.codeGameForm.get('codeGameScaffolds') as FormArray;
      if (
        this.questionLoaded &&
        codeGameScaffolds.length === 0 &&
        language &&
        !this.importingTask
      ) {
        this.addDefaultCodeScaffolds(language);
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      if (questionId) {
        this.questionDataService
          .getDetailedQuestionData(questionId, this.thisQuestionType)
          .subscribe(data => {
            this.questionData = data;
            console.log('CodeGame: Question data:', this.questionData); // TODO: remove

            if (!this.questionData.codeGameQuestion) {
              this.questionData.codeGameQuestion = {
                id: 0,
                contentElementId: 0,
                text: '',
                programmingLanguage: '', // default code language
                codeSolutionRestriction: false,
                fileNameToRestrict: '',
                methodNameToRestrict: '',
                frequencyOfMethodNameToRestrict: 1,
                codeGameScaffolds: [],
                gameFileName: 'game.grid.txt', // Hardcoded for every game task
                game: '',
                gameCellRestrictions: '',
                theme: 'dino', // default theme
              };

              this.questionLoaded = true;
            }

            this.populateForm();
          });
      }
    });
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  populateForm() {
    console.log('CodeGame: Populating form with data:', this.questionData); // TODO: remove

    if (this.questionData) {
      this.codeGameForm.patchValue({
        name: this.questionData.name || '',
        text: this.questionData.text || '',
        programmingLanguage: this.questionData.codeGameQuestion?.programmingLanguage || '',
        codeSolutionRestriction:
          this.questionData.codeGameQuestion?.codeSolutionRestriction || false,
        fileNameToRestrict: this.questionData.codeGameQuestion?.fileNameToRestrict || '',
        methodNameToRestrict: this.questionData.codeGameQuestion?.methodNameToRestrict || '',
        frequencyOfMethodNameToRestrict:
          this.questionData.codeGameQuestion?.frequencyOfMethodNameToRestrict || 1,
        game: this.questionData.codeGameQuestion?.game || '',
        gameCellRestrictions: this.questionData.codeGameQuestion?.gameCellRestrictions || '',
        theme: this.questionData.codeGameQuestion?.theme || 'dino',
        level: this.questionData.level || '',
        isApproved: this.questionData.isApproved || false,
      });

      // Data for the playfield editor
      this.exportGameDataForPlayfieldEditor = {
        // By this the playfield editor can be setup again after the first setup
        // this is needed to import a task
        newDataByImportOperation: this.importingTask,

        theme: this.questionData.codeGameQuestion?.theme || '',
        gameField: this.questionData.codeGameQuestion?.game || '',
        gameCellRestrictions: this.questionData.codeGameQuestion?.gameCellRestrictions || '',
      };

      if (this.questionData.codeGameQuestion) {
        this.populateCodeGameScaffolds();
      }
    }
  }

  populateCodeGameScaffolds() {
    const codeGameScaffoldsFormArray = this.codeGameForm.get('codeGameScaffolds') as FormArray;
    codeGameScaffoldsFormArray.clear();
    this.questionData?.codeGameQuestion!.codeGameScaffolds.forEach(
      (codeGameScaffold: CodeGameScaffoldDto) => {
        codeGameScaffoldsFormArray.push(
          this.formBuilder.group({
            id: codeGameScaffold.id,
            codeFileName: codeGameScaffold.codeFileName,
            code: codeGameScaffold.code,
            visible: codeGameScaffold.visible,
            mainFile: codeGameScaffold.mainFile,
            language: codeGameScaffold.language,
          }),
        );
      },
    );
  }

  createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', Validators.required],
      programmingLanguage: ['', Validators.required],
      text: ['', Validators.required],
      codeGameScaffolds: this.formBuilder.array([]),
      gameFileName: ['game.grid.txt'],
      game: [''],
      gameCellRestrictions: [''],
      theme: [''],
      isApproved: [false],
      level: ['', Validators.required],
      codeSolutionRestriction: [false],
      fileNameToRestrict: [''],
      methodNameToRestrict: [''],
      frequencyOfMethodNameToRestrict: [1],
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
      if (this.questionData?.codeGameQuestion) {
        this.questionData.codeGameQuestion.game = newCode;
      }
    } else {
      const formArray = this.codeGameForm.get(type) as FormArray;
      const control = formArray.at(index);
      if (control) {
        control.patchValue({ code: newCode });
        if (this.questionData?.codeGameQuestion) {
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
      data: { type: type },
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
      code: data.code,
      visible: true,
      mainFile: false,
    });
    formArray.push(newElement);

    if (this.questionData?.codeGameQuestion) {
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
              language: this.codeGameForm.value.programmingLanguage,
              visible: true,
              mainFile: false,
            } as CodeGameScaffoldDto;
            questionDataArray.push(newItem);
            break;
        }
      }
    }
  }

  onLanguageChange(event: MatSelectChange) {
    const newLanguage = event.value;
    console.log('CodeGame: Language changed to:', newLanguage);

    this.codeGameForm.value.programmingLanguage = newLanguage;

    // Update the language for all code editors except the first one (task description)
    this.updateCodeEditorsLanguage(newLanguage);

    // Update restriction fields
    if (newLanguage === 'cpp' || newLanguage === 'java') {
      this.codeGameForm.patchValue({ methodNameToRestrict: 'drive();' });
    } else {
      // Python
      this.codeGameForm.patchValue({ methodNameToRestrict: 'drive()' });
    }
  }

  // Helper method to update all code editors with the new language
  private updateCodeEditorsLanguage(newLanguage: string) {
    const editors = this.codeEditors.toArray();

    editors.forEach((editor, index) => {
      // Ensure the first editor (task description) always use Markdown
      if (index === 0) {
        // Ensure the first editor (task description) always use Markdown
        editor.changeLanguage(this.markdownLanguage);
      } else {
        editor.changeLanguage(newLanguage);
      }
    });

    // Trigger change detection for the entire form
    this.codeGameForm.updateValueAndValidity();
  }

  fileVisibilityToggle(type: 'codeGameScaffolds', index: number) {
    const formArray = this.codeGameForm.get(type) as FormArray;
    const control = formArray.at(index);

    if (control) {
      control.patchValue({ visible: !control.value.visible });

      if (this.questionData?.codeGameQuestion) {
        const questionDataArray = this.questionData.codeGameQuestion[type];
        if (Array.isArray(questionDataArray) && questionDataArray[index]) {
          questionDataArray[index].visible = !questionDataArray[index].visible;
        }
      }
    }
  }

  mainFileToggle(type: 'codeGameScaffolds', index: number) {
    const formArray = this.codeGameForm.get(type) as FormArray;
    const control = formArray.at(index);

    if (control) {
      control.patchValue({ mainFile: !control.value.mainFile });

      // All other files are not main files
      formArray.controls.forEach((ctrl, i) => {
        if (i !== index) {
          ctrl.patchValue({ mainFile: false });
        }
      });

      // Update the question data
      if (this.questionData?.codeGameQuestion) {
        const questionDataArray = this.questionData.codeGameQuestion[type];
        if (Array.isArray(questionDataArray) && questionDataArray[index]) {
          questionDataArray[index].mainFile = !questionDataArray[index].mainFile;
        }

        // All other files are not main files
        for (let i = 0; i < questionDataArray.length; i++) {
          if (i !== index) {
            questionDataArray[i].mainFile = false;
          }
        }
      }
    }
  }

  confirmDelete(type: 'codeGameScaffolds', index: number, fileName: string) {
    const dialogRef = this.dialog.open(CodeGameConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Bestätigung',
        message: `Möchten Sie wirklich "${fileName}" löschen?`,
      },
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

    if (this.questionData?.codeGameQuestion) {
      const questionDataArray = this.questionData.codeGameQuestion[type];
      if (Array.isArray(questionDataArray)) {
        questionDataArray.splice(index, 1);
      }
    }
  }

  private addDefaultCodeScaffolds(language: keyof DefaultCodeGameScaffoldsDTO) {
    const codeGameScaffolds = this.codeGameForm.get('codeGameScaffolds') as FormArray;
    const defaultScaffolds = this.defaultCodeGameScaffolds[language];

    if (defaultScaffolds) {
      defaultScaffolds.forEach((scaffold: CodeGameScaffoldDTO) => {
        const scaffoldGroup = this.formBuilder.group({
          id: scaffold.id,
          codeFileName: scaffold.codeFileName,
          code: scaffold.code,
          visible: scaffold.visible,
          mainFile: scaffold.mainFile,
          language: scaffold.language,
        });
        codeGameScaffolds.push(scaffoldGroup);

        if (this.questionData?.codeGameQuestion) {
          const scaffoldWithId: CodeGameScaffoldDto = {
            ...scaffold,
            codeGameQuestionId: this.questionData.codeGameQuestion.id,
          };
          this.questionData.codeGameQuestion.codeGameScaffolds.push(scaffoldWithId);
        } else {
          console.error('CodeGame: questionData or codeGameQuestion is null');
        }
      });
    }

    // Check if scaffolds were added
    if (language === 'java' || language === 'python') {
      if (codeGameScaffolds.length != 8) {
        console.error('CodeGame: Default scaffolds were not added correctly');
      }
    } else if (language === 'cpp') {
      if (codeGameScaffolds.length != 15) {
        console.error('CodeGame: Default scaffolds were not added correctly');
      }
    }
  }

  handleDataChangePayfieldEditor(event: any) {
    this.codeGameForm.patchValue({ game: event.gameField });
    this.codeGameForm.patchValue({ gameCellRestrictions: event.gameCellRestrictions });
    this.codeGameForm.patchValue({ theme: event.theme });
  }

  getFieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      programmingLanguage: 'Programmiersprache',
      text: 'Aufgabentext',
      level: 'Schwierigkeitsgrad',
    };
    return displayNames[field] || field;
  }

  // TODO: need to test
  getMissingFields(): string[] {
    const missingFields: string[] = [];
    const requiredFields = ['name', 'programmingLanguage', 'text', 'game'];

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
    if (this.questionData) {
      const mainFile = this.questionData.codeGameQuestion!.codeGameScaffolds.find(
        scaffold => scaffold.mainFile,
      );
      if (!mainFile) {
        this.snackBar.open('Bitte wählen Sie ein MainFile aus.', 'Close', { duration: 5000 });
        return;
      }
    }

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
          contentElementId: this.questionData.codeGameQuestion!.contentElementId,
          text: this.codeGameForm.value.text,
          programmingLanguage: this.codeGameForm.value.programmingLanguage,
          codeSolutionRestriction: this.codeGameForm.value.codeSolutionRestriction,
          fileNameToRestrict: this.codeGameForm.value.fileNameToRestrict,
          methodNameToRestrict: this.codeGameForm.value.methodNameToRestrict,
          frequencyOfMethodNameToRestrict: this.codeGameForm.value.frequencyOfMethodNameToRestrict,
          codeGameScaffolds: this.questionData.codeGameQuestion!.codeGameScaffolds,
          gameFileName: 'game.grid.txt', // Hardcoded for every game task
          game: this.codeGameForm.value.game,
          gameCellRestrictions: this.codeGameForm.value.gameCellRestrictions,
          theme: this.codeGameForm.value.theme,
        },
      };

      // print question as JSON in console
      // console.log('CodeGame: Question to update:', JSON.stringify(updatedQuestion.codeGameQuestion?.codeGameScaffolds, null, 2));

      this.questionDataService.updateWholeQuestion(updatedQuestion).subscribe(
        response => {
          console.log('CodeGame: Question updated successfully:', response);
          this.snackBar.open('Question updated successfully', 'Schließen', { duration: 3000 });
        },
        error => {
          console.error('Error updating question:', error);
          this.snackBar.open('Error updating question', 'Schließen', { duration: 3000 });
        },
      );
    } else {
      const missingFields = this.getMissingFields();
      const errorMessage = `Bitte füllen Sie alle erforderlichen Felder aus: ${missingFields.join(', ')}`;
      this.snackBar.open(errorMessage, 'Schließen', { duration: 5000 });
    }
  }

  exportTask() {
    if (!this.questionData) {
      this.snackBar.open('Keine Daten zum Exportieren verfügbar', 'Schließen', { duration: 3000 });
      return;
    }

    if (!this.codeGameForm.valid) {
      this.snackBar.open('Bitte füllen Sie alle erforderlichen Felder aus', 'Schließen', {
        duration: 3000,
      });
      return;
    }

    // Create a JSON object with all relevant data
    const exportData: detailedQuestionDTO = {
      ...this.questionData,
      name: this.codeGameForm.value.name,
      text: this.codeGameForm.value.text,
      isApproved: this.codeGameForm.value.isApproved,
      level: this.codeGameForm.value.level,
      codeGameQuestion: {
        ...this.questionData.codeGameQuestion,
        id: this.questionData.codeGameQuestion!.id,
        contentElementId: this.questionData.codeGameQuestion!.contentElementId,
        text: this.codeGameForm.value.text,
        programmingLanguage: this.codeGameForm.value.programmingLanguage,
        codeSolutionRestriction: this.codeGameForm.value.codeSolutionRestriction,
        fileNameToRestrict: this.codeGameForm.value.fileNameToRestrict,
        methodNameToRestrict: this.codeGameForm.value.methodNameToRestrict,
        frequencyOfMethodNameToRestrict: this.codeGameForm.value.frequencyOfMethodNameToRestrict,
        codeGameScaffolds: this.questionData.codeGameQuestion!.codeGameScaffolds,
        gameFileName: 'game.grid.txt', // Hardcoded for every game task
        game: this.codeGameForm.value.game,
        gameCellRestrictions: this.codeGameForm.value.gameCellRestrictions,
        theme: this.codeGameForm.value.theme,
      },
    };

    // Create a Blob with the JSON data
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.questionData.name.replace(/\s+/g, '_')}_export.json`;

    // Trigger the download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Aufgabe erfolgreich exportiert', 'Schließen', { duration: 3000 });
  }

  isImportPossible() {
    /*
     * Import is only possible, if the CodeGameQuestion is not yet created.
     * Otherwise the backend will not know which codeGameScaffold belongs to which question.
     */

    if (this.questionData && this.questionData.codeGameQuestion?.id === 0) {
      // CodeGameQuestion is not created yet
      return true;
    }

    return false;
  }

  importTask(event: any) {
    this.importingTask = true;

    const file = event.target.files[0];
    if (!file) {
      this.snackBar.open('Keine Datei ausgewählt', 'Schließen', { duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const importedData = JSON.parse(e.target.result);
        this.processImportedData(importedData);
      } catch (error) {
        console.error('Fehler beim Parsen der JSON-Datei:', error);
        this.snackBar.open('Fehler beim Lesen der Datei', 'Schließen', { duration: 3000 });
      }
    };
    reader.readAsText(file);
  }

  private processImportedData(importedData: any) {
    if (!this.codeGameForm || !this.questionData) {
      this.snackBar.open('Fehler beim Importieren der Aufgabe', 'Schließen', { duration: 3000 });
      return;
    }

    // Set data to the form
    this.questionData = {
      ...this.questionData,
      name: importedData.name,
      text: importedData.text,
      codeGameQuestion: {
        id: this.questionData.codeGameQuestion!.id, // Take the existing ID
        contentElementId: this.questionData.codeGameQuestion!.contentElementId, // Take the existing ID
        text: importedData.text,
        programmingLanguage: importedData.codeGameQuestion.programmingLanguage,
        codeSolutionRestriction: importedData.codeGameQuestion.codeSolutionRestriction,
        fileNameToRestrict: importedData.codeGameQuestion.fileNameToRestrict,
        methodNameToRestrict: importedData.codeGameQuestion.methodNameToRestrict,
        frequencyOfMethodNameToRestrict:
          importedData.codeGameQuestion.frequencyOfMethodNameToRestrict,
        gameFileName: 'game.grid.txt',
        game: importedData.codeGameQuestion.game,
        gameCellRestrictions: importedData.codeGameQuestion.gameCellRestrictions,
        theme: importedData.codeGameQuestion.theme,
        codeGameScaffolds: importedData.codeGameQuestion.codeGameScaffolds.map((scaffold: any) => ({
          ...scaffold,
          id: 0, // New ID will be generated by the server
          codeGameQuestionId: 0, // New ID will be generated by the server
        })),
      },
    };

    // Update the form with the imported data
    this.populateForm();
    this.snackBar.open('Aufgabe erfolgreich importiert', 'Schließen', { duration: 3000 });

    this.importingTask = false;
  }
}
