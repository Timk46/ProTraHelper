import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { EditCodeService } from './edit-coding.service';
import { questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO, CodeGeruestDto, ModelSolutionDto, AutomatedTestDto, CodeSubmissionResultDto } from '@DTOs/index';
import { ActivatedRoute } from '@angular/router';
import { AddElementModalComponent } from './add-element-modal.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';

@Component({
  selector: 'app-edit-coding',
  templateUrl: './edit-coding.component.html',
  styleUrls: ['./edit-coding.component.scss']
})
export class EditCodingComponent implements OnInit {
  codingForm: FormGroup;
  thisQuestionType = questionType.CODE;
  questionData: detailedQuestionDTO| null = null;
  markdownLanguage = 'markdown';
  showPreview = false;
  testResults: CodeSubmissionResultDto | null = null;

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

          // If codingQuestion doesn't exist, create an empty one
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
    })
  }

  createForm(): FormGroup {
    return this.fb.group({
      inhalt: [''],
      kontext: [''],
      name: ['', Validators.required],
      programmingLanguage: ['', Validators.required],
      text: ['', Validators.required],
      codeGerueste: this.fb.array([]),
      modelSolutions: this.fb.array([]),
      automatedTests: this.fb.array([]),
      expectations: ['', Validators.required],
      mainFileName: [''],
      runMethod: [''],
      inputArguments: [''],
      isApproved: [false],
      level: ['', Validators.required]
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
        level: this.questionData.level || ''
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

  onCodeChange(newCode: string, index: number, type: 'codeGerueste' | 'automatedTests' | 'modelSolutions' | 'text') {
    if (type === 'text') {
      this.codingForm.patchValue({ text: newCode });
      if (this.questionData) {
        this.questionData.text = newCode;
      }
    } else {
      const formArray = this.codingForm.get(type) as FormArray;
      formArray.at(index).patchValue({ code: newCode });
      if (this.questionData && this.questionData.codingQuestion) {
        const questionDataArray = this.questionData.codingQuestion[type];
        if (Array.isArray(questionDataArray) && questionDataArray[index]) {
          questionDataArray[index].code = newCode;
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
    console.log('Form submitted:', this.codingForm.value);
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
          const importedData = JSON.parse(e.target?.result as string);
          this.questionData = importedData;
          if (this.questionData && this.questionData.codingQuestion) {
            this.codingForm.patchValue({
              runMethod: this.questionData.codingQuestion.automatedTests[0].runMethod || '',
              inputArguments: this.questionData.codingQuestion.automatedTests[0].inputArguments || '',
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

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  generateTask() {
    const inhalt = this.codingForm.get('inhalt')?.value;
    const kontext = this.codingForm.get('kontext')?.value;

    if (inhalt && kontext) {
      this.editCodeService.generateCppTask(this.codingForm.value.text, this.codingForm.value.codeGerueste).subscribe(
        (genTask: genTaskDto) => {
          console.log('Generated task:', genTask);
          this.populateFormWithGenTask(genTask);
          this.snackBar.open('Task generated successfully', 'Close', { duration: 3000 });
        },
        error => {
          console.error('Error generating task:', error);
          this.snackBar.open('Error generating task', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.snackBar.open('Please fill in both content and context', 'Close', { duration: 3000 });
    }
  }

  populateFormWithGenTask(genTask: genTaskDto) {
    console.log(genTask)
    /*
    this.codingForm.patchValue({
      name: genTask.name,
      text: genTask.text,
      programmingLanguage: genTask.programmingLanguage,
      expectations: genTask.expectations,
      mainFileName: genTask.mainFileName,
      level: genTask.level
    });

    // Clear existing arrays
    (this.codingForm.get('codeGerueste') as FormArray).clear();
    (this.codingForm.get('modelSolutions') as FormArray).clear();
    (this.codingForm.get('automatedTests') as FormArray).clear();

    // Populate codeGerueste
    genTask.codeGerueste.forEach(codeGeruest => {
      (this.codingForm.get('codeGerueste') as FormArray).push(
        this.fb.group({
          id: 0,
          codeFileName: codeGeruest.codeFileName,
          code: codeGeruest.code
        })
      );
    });

    // Populate modelSolutions
    genTask.modelSolutions.forEach(solution => {
      (this.codingForm.get('modelSolutions') as FormArray).push(
        this.fb.group({
          id: 0,
          codeFileName: solution.codeFileName,
          code: solution.code
        })
      );
    });

    // Populate automatedTests
    genTask.automatedTests.forEach(test => {
      (this.codingForm.get('automatedTests') as FormArray).push(
        this.fb.group({
          id: 0,
          testFileName: test.testFileName,
          code: test.code,
          runMethod: test.runMethod,
          inputArguments: test.inputArguments
        })
      );
    });

    // Update the form controls
    this.codingForm.updateValueAndValidity();
    */
  }
}
