import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuestionDataService } from '../../../Services/question/question-data.service';
import { questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO} from '@DTOs/index';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';

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
    private route: ActivatedRoute
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
      automatedTests: this.fb.array([])
    });
  }

  populateForm() {
    if (this.questionData) {
      this.codingForm.patchValue({
        name: this.questionData.name,
        programmingLanguage: this.questionData.codingQuestion!.programmingLanguage,
        text: this.questionData.text
      });

      this.populateCodeGerueste();
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

  get automatedTestsControls() {
    return (this.codingForm.get('automatedTests') as FormArray).controls;
  }

  onCodeChange(newCode: string, index: number, type: 'codeGerueste' | 'automatedTests') {
    const formArray = this.codingForm.get(type) as FormArray;
    formArray.at(index).patchValue({ code: newCode });
  }

  onSubmit() {
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
          automatedTests: this.codingForm.value.automatedTests
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
}
