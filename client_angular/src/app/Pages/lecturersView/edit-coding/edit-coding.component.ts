import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO} from '@DTOs/index';
import { ActivatedRoute } from '@angular/router';
import { AddElementModalComponent } from './add-element-modal.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  selector: 'app-edit-coding',
  templateUrl: './edit-coding.component.html',
  styleUrls: ['./edit-coding.component.scss']
})
export class EditCodingComponent implements OnInit {
  codingForm: FormGroup;
  thisQuestionType = questionType.CODE;
  questionData: detailedQuestionDTO| null = null;

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {
    this.codingForm = this.createForm();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        this.questionData = data;
        this.populateForm();
      });
    })
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: [''],
      programmingLanguage: [''],
      text: [''],
      codeGerueste: this.fb.array([]),
      modelSolutions: this.fb.array([]),
      automatedTests: this.fb.array([]),
      expectations: ['']
    });
  }

  populateForm() {
    if (this.questionData) {
      this.codingForm.patchValue({
        name: this.questionData.name,
        programmingLanguage: this.questionData.codingQuestion!.programmingLanguage,
        text: this.questionData.text,
        expectations: this.questionData.codingQuestion!.expectations || ''
      });

      this.populateCodeGerueste();
      this.populateModelSolutions();
      this.populateAutomatedTests();
    }
  }

  populateCodeGerueste() {
    const codeGeruesteFormArray = this.codingForm.get('codeGerueste') as FormArray;
    codeGeruesteFormArray.clear();
    this.questionData?.codingQuestion!.codeGerueste.forEach((codeGeruest: any) => {
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
    this.questionData?.codingQuestion!.modelSolutions?.forEach((solution: any) => {
      modelSolutionsFormArray.push(this.fb.group({
        id: solution.id,
        solutionFileName: solution.solutionFileName,
        code: solution.code
      }));
    });
  }

  populateAutomatedTests() {
    const automatedTestsFormArray = this.codingForm.get('automatedTests') as FormArray;
    automatedTestsFormArray.clear();
    this.questionData?.codingQuestion!.automatedTests.forEach((test: any) => {
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

  onCodeChange(newCode: string, index: number, type: 'codeGerueste' | 'automatedTests' | 'modelSolutions') {
    const formArray = this.codingForm.get(type) as FormArray;
    formArray.at(index).patchValue({ code: newCode });
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
    switch (type) {
      case 'codeGerueste':
        formArray.push(this.fb.group({
          codeFileName: data.fileName,
          code: data.code
        }));
        break;
      case 'modelSolutions':
        formArray.push(this.fb.group({
          solutionFileName: data.fileName,
          code: data.code
        }));
        break;
      case 'automatedTests':
        formArray.push(this.fb.group({
          testFileName: data.fileName,
          code: data.code
        }));
        break;
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
  }

  onSubmit() {
    console.log('Form submitted:', this.codingForm.value);
    if (this.codingForm.valid && this.questionData && this.questionData.codingQuestion) {
      const updatedQuestion: detailedQuestionDTO = {
        ...this.questionData,
        name: this.codingForm.value.name,
        text: this.codingForm.value.text,
        codingQuestion: {
          ...this.questionData.codingQuestion,
          id: this.questionData.codingQuestion.id ?? 0,
          programmingLanguage: this.codingForm.value.programmingLanguage,
          codeGerueste: this.codingForm.value.codeGerueste,
          modelSolutions: this.codingForm.value.modelSolutions,
          automatedTests: this.codingForm.value.automatedTests,
          expectations: this.codingForm.value.expectations
        }
      };

      this.questionDataService.updateQuestion(updatedQuestion).subscribe(
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
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
    }
  }

  exportTask() {
    if (this.questionData && this.questionData.codingQuestion) {
      const exportData = {
        ...this.questionData,
        codingQuestion: {
          ...this.questionData.codingQuestion,
          ...this.codingForm.value
        }
      };
      const jsonString = JSON.stringify(exportData, null, 2);
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
}
