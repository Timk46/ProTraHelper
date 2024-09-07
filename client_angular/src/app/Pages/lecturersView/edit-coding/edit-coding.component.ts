import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { detailedQuestionDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-edit-coding',
  templateUrl: './edit-coding.component.html',
  styleUrls: ['./edit-coding.component.scss']
})
export class EditCodingComponent {

  @ViewChild('question') questionField!: TinymceComponent;
  @ViewChild('expectations') expectationField!: TinymceComponent;
  @ViewChild('solution') solutionField!: TinymceComponent;

  freeTextForm: FormGroup;
  tempAllData: String = "";
  parsedAllData: any; // New property to store parsed JSON

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  detailedQuestionData: detailedQuestionDTO = {
    id: -1,
    name: '',
    description: '',
    score: 0,
    type: 'FreeText',
    level: 1,
    mode: 'practise',
    authorId: -1,
    text: '',
    isApproved: false,
    version: 1,
    originId: -1,
  };

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,

  ) {
    this.freeTextForm = this.fb.group({
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
    }, 0);
  }

  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId).subscribe(data => {
        this.tempAllData = JSON.stringify(data);
        this.parsedAllData = data; // Store the parsed JSON
        if (data.type === 'FreeText') {
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.detailedQuestionData.type = data.type;
        }
      });
    });
  }


  // BEGIN JSON OUTPUT AND DEBUGGING ****************************************************
  private setContent() {
    if (this.detailedQuestionData.freetextQuestion){
      this.freeTextForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      this.questionField.setContent(this.detailedQuestionData.freetextQuestion.textHTML || this.detailedQuestionData.text);
      this.expectationField.setContent(this.detailedQuestionData.freetextQuestion.expectationsHTML || this.detailedQuestionData.freetextQuestion.expectations);
      this.solutionField.setContent(this.detailedQuestionData.freetextQuestion.exampleSolutionHTML || this.detailedQuestionData.freetextQuestion.exampleSolution || '');
    }
  }

  // Methods for template
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }
  // END JSON OUTPUT AND DEBUGGING ****************************************************
}
