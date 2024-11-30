import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { EditCodeService } from './edit-coding.service';
import { CodingQuestionInternal, questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO, CodeGeruestDto, ModelSolutionDto, AutomatedTestDto, CodeSubmissionResultDto } from '@DTOs/index';
import { ActivatedRoute } from '@angular/router';
import { AddElementModalComponent } from './add-element-modal.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MatSelectChange } from '@angular/material/select';
import { CodeEditorComponent } from '../../../Modules/tutor-kai/sites/code-editor/code-editor.component';

@Component({
  selector: 'app-edit-coding',
  templateUrl: './edit-coding.component.html',
  styleUrls: ['./edit-coding.component.scss']
})
export class EditCodingComponent implements OnInit {
  @ViewChildren(CodeEditorComponent) codeEditors!: QueryList<CodeEditorComponent>;

  codingForm: FormGroup;
  thisQuestionType = questionType.CODE;
  questionData: detailedQuestionDTO | null = null;
  markdownLanguage = 'markdown';
  showTaskPreview = false;
  showExpectationsPreview = false;
  testResults: CodeSubmissionResultDto | null = null;
  isGenerating = false; // Loading state variable

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private editCodeService: EditCodeService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {
    this.codingForm = this.createForm();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      if (questionId) {
        this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
          this.questionData = data;
          console.log('Question data:', this.questionData);

          if (!this.questionData.codingQuestion) {
            this.questionData.codingQuestion = {
              id: 0,
              programmingLanguage: '',
              codeGerueste: [],
              modelSolutions: [],
              automatedTests: [],
              expectations: '',
              mainFileName: '',
              count_InputArgs: 0,
              text: '',
              textHTML: ''
            };
          }

          this.populateForm();
        });
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      programmingLanguage: ['', Validators.required],
      text: ['', Validators.required],
      codeGerueste: this.fb.array([]),
      modelSolutions: this.fb.array([]),
      automatedTests: this.fb.array([]),
      expectations: ['', Validators.required],
      mainFileName: [''], // needed for python-tasks
      runMethod: [''], // needed for python-tasks
      inputArguments: [''],  // needed for python-tasks
      isApproved: [false],
      level: ['', Validators.required],
      context: [''], // new field for python task generation
      concept: [''] // new field for python task generation
    });
  }

  populateForm() {
    if (this.questionData) {
      this.codingForm.patchValue({
        name: this.questionData.name || '',
        programmingLanguage: this.questionData.codingQuestion?.programmingLanguage || '',
        text: this.questionData.text || '',
        expectations: this.questionData.codingQuestion?.expectations || '',
        mainFileName: this.questionData.codingQuestion?.mainFileName || '',
        runMethod: this.questionData.codingQuestion?.automatedTests[0]?.runMethod || '',
        inputArguments: this.questionData.codingQuestion?.automatedTests[0]?.inputArguments || '',
        isApproved: this.questionData.isApproved || false,
        level: this.questionData.level || '',
        context: '', // Initialize with empty string
        concept: '' // Initialize with empty string
      });

      if (this.questionData.codingQuestion) {
        this.populateCodeGerueste();
        this.populateModelSolutions();
        this.populateAutomatedTests();
      }
    }
  }

  populateCodeGerueste() {
    const codeGeruesteFormArray = this.codingForm.get('codeGerueste') as FormArray;
    codeGeruesteFormArray.clear();
    this.questionData?.codingQuestion!.codeGerueste.forEach((codeGeruest: CodeGeruestDto) => {
      codeGeruesteFormArray.push(this.fb.group({
        id: codeGeruest.id,
        codeFileName: codeGeruest.codeFileName,
        code: codeGeruest.code
      }));
    });
  }

  populateModelSolutions() {
    const modelSolutionsFormArray = this.codingForm.get('modelSolutions') as FormArray;
    modelSolutionsFormArray.clear();
    this.questionData?.codingQuestion!.modelSolutions?.forEach((solution: ModelSolutionDto) => {
      modelSolutionsFormArray.push(this.fb.group({
        id: solution.id,
        codeFileName: solution.codeFileName,
        code: solution.code
      }));
    });
  }

  populateAutomatedTests() {
    const automatedTestsFormArray = this.codingForm.get('automatedTests') as FormArray;
    automatedTestsFormArray.clear();
    this.questionData?.codingQuestion!.automatedTests.forEach((test: AutomatedTestDto) => {
      automatedTestsFormArray.push(this.fb.group({
        id: test.id,
        testFileName: test.testFileName,
        code: test.code
      }));
    });
  }

  get codeGeruesteControls() {
    return (this.codingForm.get('codeGerueste') as FormArray).controls;
  }

  get modelSolutionsControls() {
    return (this.codingForm.get('modelSolutions') as FormArray).controls;
  }

  get automatedTestsControls() {
    return (this.codingForm.get('automatedTests') as FormArray).controls;
  }

  onCodeChange(newCode: string, index: number, type: 'codeGerueste' | 'automatedTests' | 'modelSolutions' | 'text' | 'expectations') {
    if (type === 'text' || type === 'expectations') {
      this.codingForm.patchValue({ [type]: newCode });
      if (this.questionData) {
        if (type === 'text') {
          this.questionData.text = newCode;
        } else if (type === 'expectations' && this.questionData.codingQuestion) {
          this.questionData.codingQuestion.expectations = newCode;
        }
      }
    } else {
      const formArray = this.codingForm.get(type) as FormArray;
      const control = formArray.at(index);
      if (control) {
        control.patchValue({ code: newCode });
        if (this.questionData && this.questionData.codingQuestion) {
          const questionDataArray = this.questionData.codingQuestion[type];
          if (Array.isArray(questionDataArray) && questionDataArray[index]) {
            questionDataArray[index].code = newCode;
          }
        }
      }
    }
  }

  openAddModal(type: 'codeGerueste' | 'modelSolutions' | 'automatedTests') {
    const dialogRef = this.dialog.open(AddElementModalComponent, {
      width: '500px',
      data: { type: type }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addElement(type, result);
      }
    });
  }

  addElement(type: 'codeGerueste' | 'modelSolutions' | 'automatedTests', data: any) {
    const formArray = this.codingForm.get(type) as FormArray;
    const newElement = this.fb.group({
      id: 0,
      [type === 'automatedTests' ? 'testFileName' : 'codeFileName']: data.fileName,
      code: data.code
    });
    formArray.push(newElement);

    if (this.questionData && this.questionData.codingQuestion) {
      const questionDataArray = this.questionData.codingQuestion[type];
      if (Array.isArray(questionDataArray)) {
        let newItem;
        switch (type) {
          case 'codeGerueste':
            newItem = {
              id: 0,
              codeFileName: data.fileName,
              code: data.code,
              codingQuestionId: this.questionData.codingQuestion.id,
              language: this.questionData.codingQuestion.programmingLanguage
            } as CodeGeruestDto;
            (questionDataArray as CodeGeruestDto[]).push(newItem);
            break;
          case 'modelSolutions':
            newItem = {
              id: 0,
              codeFileName: data.fileName,
              code: data.code,
              codingQuestionId: this.questionData.codingQuestion.id,
              language: this.questionData.codingQuestion.programmingLanguage
            } as ModelSolutionDto;
            (questionDataArray as ModelSolutionDto[]).push(newItem);
            break;
          case 'automatedTests':
            newItem = {
              id: 0,
              testFileName: data.fileName,
              code: data.code,
              codingQuestionId: this.questionData.codingQuestion.id,
              language: this.questionData.codingQuestion.programmingLanguage,
              questionId: this.questionData.id
            } as AutomatedTestDto;
            (questionDataArray as AutomatedTestDto[]).push(newItem);
            break;
        }
      }
    }
  }

  confirmDelete(type: 'codeGerueste' | 'modelSolutions' | 'automatedTests', index: number, fileName: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
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

  deleteElement(type: 'codeGerueste' | 'modelSolutions' | 'automatedTests', index: number) {
    const formArray = this.codingForm.get(type) as FormArray;
    formArray.removeAt(index);

    if (this.questionData && this.questionData.codingQuestion) {
      const questionDataArray = this.questionData.codingQuestion[type];
      if (Array.isArray(questionDataArray)) {
        questionDataArray.splice(index, 1);
      }
    }
  }

  onSubmit() {
    if (this.codingForm.valid && this.questionData) {
      const updatedQuestion: detailedQuestionDTO = {
        ...this.questionData,
        name: this.codingForm.value.name,
        text: this.codingForm.value.text,
        isApproved: this.codingForm.value.isApproved,
        level: this.codingForm.value.level,
        codingQuestion: {
          ...this.questionData.codingQuestion,
          id: this.questionData.codingQuestion!.id ?? 0,
          programmingLanguage: this.codingForm.value.programmingLanguage,
          codeGerueste: this.codingForm.value.codeGerueste,
          modelSolutions: this.codingForm.value.modelSolutions,
          count_InputArgs: 0,
          text: this.codingForm.value.text,
          textHTML: this.codingForm.value.text,
          automatedTests: this.codingForm.value.automatedTests.map((test: any) => ({
            ...test,
            runMethod: this.codingForm.value.runMethod,
            inputArguments: this.codingForm.value.inputArguments
          })),
          expectations: this.codingForm.value.expectations,
          mainFileName: this.codingForm.value.mainFileName,
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

  getMissingFields(): string[] {
    const missingFields: string[] = [];
    const requiredFields = ['name', 'programmingLanguage', 'text', 'expectations', 'level'];

    for (const field of requiredFields) {
      if (this.codingForm.get(field)?.invalid) {
        missingFields.push(this.getFieldDisplayName(field));
      }
    }

    const codeGerueste = this.codingForm.get('codeGerueste') as FormArray;
    const modelSolutions = this.codingForm.get('modelSolutions') as FormArray;
    const automatedTests = this.codingForm.get('automatedTests') as FormArray;

    if (codeGerueste.length === 0) {
      missingFields.push('Code-Gerüste');
    }
    if (modelSolutions.length === 0) {
      missingFields.push('Musterlösungen');
    }
    if (automatedTests.length === 0) {
      missingFields.push('Automatisierte Tests');
    }

    return missingFields;
  }

  getFieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      programmingLanguage: 'Programmiersprache',
      text: 'Aufgabentext',
      expectations: 'Erwartungshorizont',
      level: 'Schwierigkeitsgrad'
    };
    return displayNames[field] || field;
  }

  testCode() {
    if (!this.isProgrammingLanguageSelected()) {
      this.snackBar.open('Bitte wählen Sie zuerst eine Programmiersprache aus.', 'Close', { duration: 5000 });
      return;
    }

    if (this.codingForm.valid && this.questionData && this.questionData.codingQuestion) {
      const questionToTest: detailedQuestionDTO = {
        ...this.questionData,
        name: this.codingForm.value.name,
        text: this.codingForm.value.text,
        isApproved: this.codingForm.value.isApproved,
        level: this.codingForm.value.level,
        codingQuestion: {
          ...this.questionData.codingQuestion,
          id: this.questionData.codingQuestion.id ?? 0,
          programmingLanguage: this.codingForm.value.programmingLanguage,
          codeGerueste: this.codingForm.value.codeGerueste,
          modelSolutions: this.codingForm.value.modelSolutions,
          automatedTests: this.codingForm.value.automatedTests.map((test: any) => ({
            ...test,
            runMethod: this.codingForm.value.runMethod,
            inputArguments: this.codingForm.value.inputArguments
          })),
          expectations: this.codingForm.value.expectations,
          mainFileName: this.codingForm.value.mainFileName,
        }
      };

      this.editCodeService.executeForTaskCreation(questionToTest).subscribe(
        (result: CodeSubmissionResultDto) => {
          this.testResults = result;
          console.log('Test results:', this.testResults);
          this.snackBar.open('Code tested successfully', 'Close', { duration: 3000 });
        },
        error => {
          console.error('Error testing code:', error);
          this.snackBar.open('Error testing code', 'Close', { duration: 3000 });
        }
      );
    } else {
      const missingFields = this.getMissingFields();
      const errorMessage = `Bitte füllen Sie alle erforderlichen Felder aus, bevor Sie testen: ${missingFields.join(', ')}`;
      this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
    }
  }

  generateTaskCpp() {
    if (!this.isProgrammingLanguageSelected()) {
      this.snackBar.open('Bitte wählen Sie zuerst eine Programmiersprache aus.', 'Close', { duration: 5000 });
      return;
    }

    const text = this.codingForm.get('text')?.value;
    const codeGerueste = this.codingForm.get('codeGerueste')?.value;

    if (text && codeGerueste && codeGerueste.length > 0) {
      this.isGenerating = true; // Set loading state to true
      this.editCodeService.generateCppTask(text, codeGerueste).subscribe(
        (genTask: CodingQuestionInternal) => {
          console.log('Generated task:', genTask);
          this.populateFormWithGenTask(genTask);
          this.snackBar.open('Task generated successfully', 'Close', { duration: 3000 });
          this.isGenerating = false; // Set loading state to false
        },
        error => {
          console.error('Error generating task:', error);
          this.snackBar.open('Error generating task', 'Close', { duration: 3000 });
          this.isGenerating = false; // Set loading state to false
        }
      );
    } else {
      this.snackBar.open('Please fill in the question text and add at least one code scaffold', 'Close', { duration: 3000 });
    }
  }

  generateTaskPython() {
    if (!this.isProgrammingLanguageSelected()) {
      this.snackBar.open('Bitte wählen Sie zuerst eine Programmiersprache aus.', 'Close', { duration: 5000 });
      return;
    }

    const context = this.codingForm.get('context')?.value;
    const concept = this.codingForm.get('concept')?.value;

    if (!context || !concept) {
      this.snackBar.open('Bitte füllen Sie Kontext und Konzept aus.', 'Close', { duration: 3000 });
      return;
    }

    this.isGenerating = true; // Set loading state to true
    this.editCodeService.generatePythonTask(concept, context).subscribe(
      (genTask: CodingQuestionInternal) => {
        console.log('Generated task:', genTask);
        this.populateFormWithGenTask(genTask);
        this.snackBar.open('Task generated successfully', 'Close', { duration: 3000 });
        this.isGenerating = false; // Set loading state to false
      },
      error => {
        console.error('Error generating task:', error);
        this.snackBar.open('Error generating task', 'Close', { duration: 3000 });
        this.isGenerating = false; // Set loading state to false
      }
    );
  }

  exportTask() {
    if (this.questionData && this.questionData.codingQuestion) {
      const exportQuestion: detailedQuestionDTO = {
        ...this.questionData,
        name: this.codingForm.value.name,
        text: this.codingForm.value.text,
        isApproved: this.codingForm.value.isApproved,
        level: this.codingForm.value.level,
        codingQuestion: {
          ...this.questionData.codingQuestion,
          id: this.questionData.codingQuestion.id ?? 0,
          programmingLanguage: this.codingForm.value.programmingLanguage,
          codeGerueste: this.codingForm.value.codeGerueste,
          modelSolutions: this.codingForm.value.modelSolutions,
          automatedTests: this.codingForm.value.automatedTests.map((test: any) => ({
            ...test,
            runMethod: this.codingForm.value.runMethod,
            inputArguments: this.codingForm.value.inputArguments
          })),
          expectations: this.codingForm.value.expectations,
          mainFileName: this.codingForm.value.mainFileName,
        }
      };
      const jsonString = JSON.stringify(exportQuestion, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coding_task_${this.questionData.id}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  importTask(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const importedData = JSON.parse(e.target?.result as string) as detailedQuestionDTO;
          this.questionData = importedData;
          if (this.questionData && this.questionData.codingQuestion) {
            this.codingForm.patchValue({
              runMethod: this.questionData.codingQuestion.automatedTests[0]?.runMethod || '',
              inputArguments: this.questionData.codingQuestion.automatedTests[0]?.inputArguments || '',
              mainFileName: this.questionData.codingQuestion.mainFileName || ''
            });
          }
          this.populateForm();
          this.snackBar.open('Task imported successfully', 'Close', { duration: 3000 });
        } catch (error) {
          console.error('Error parsing imported JSON:', error);
          this.snackBar.open('Error importing task', 'Close', { duration: 3000 });
        }
      };
      reader.readAsText(file);
    }
  }

  togglePreview(type: 'task' | 'expectations') {
    if (type === 'task') {
      this.showTaskPreview = !this.showTaskPreview;
    } else if (type === 'expectations') {
      this.showExpectationsPreview = !this.showExpectationsPreview;
    }
  }

  isEditorReadOnly(): boolean {
    return this.isGenerating;
  }

  isProgrammingLanguageSelected(): boolean {
    const programmingLanguage = this.codingForm.get('programmingLanguage')?.value;
    return !!programmingLanguage;
  }

  onLanguageChange(event: MatSelectChange) {
    const newLanguage = event.value;
    console.log('Language changed to:', newLanguage);
    this.updateCodeEditorsLanguage(newLanguage);
  }

  private updateCodeEditorsLanguage(newLanguage: string) {
    const editors = this.codeEditors.toArray();
    const lastIndex = editors.length - 1;

    editors.forEach((editor, index) => {
      if (index === 0 || index === lastIndex) {
        editor.changeLanguage(this.markdownLanguage);
      } else {
        editor.changeLanguage(newLanguage);
      }
    });

    this.codingForm.updateValueAndValidity();
  }

  populateFormWithGenTask(genTask: CodingQuestionInternal) {
    console.log('Populating form with generated task:', genTask);

    this.codingForm.patchValue({
      programmingLanguage: genTask.programmingLanguage,
      expectations: genTask.expectations,
      mainFileName: genTask.mainFileName,
      count_InputArgs: genTask.count_InputArgs,
      text: genTask.text, // Add text field
      // Get runMethod and inputArguments from the first automated test if available
      runMethod: genTask.automatedTests[0]?.runMethod || '',
      inputArguments: genTask.automatedTests[0]?.inputArguments || ''
    });

    (this.codingForm.get('codeGerueste') as FormArray).clear();
    (this.codingForm.get('modelSolutions') as FormArray).clear();
    (this.codingForm.get('automatedTests') as FormArray).clear();

    genTask.codeGerueste?.forEach(codeGeruest => {
      this.addElement('codeGerueste', {
        fileName: codeGeruest.codeFileName,
        code: codeGeruest.code
      });
    });

    genTask.modelSolutions?.forEach(solution => {
      this.addElement('modelSolutions', {
        fileName: solution.codeFileName,
        code: solution.code
      });
    });

    genTask.automatedTests?.forEach(test => {
      this.addElement('automatedTests', {
        fileName: test.testFileName ? test.testFileName : 'testFile',
        code: test.code // Pass the code directly
      });
    });

    this.updateCodeEditorsLanguage(genTask.programmingLanguage);
  }
}
