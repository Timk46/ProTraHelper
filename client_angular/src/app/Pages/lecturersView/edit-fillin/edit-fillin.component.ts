import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { detailedQuestionDTO, questionType } from '@DTOs/index';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Component({
  selector: 'app-edit-fillin',
  templateUrl: './edit-fillin.component.html',
  styleUrls: ['./edit-fillin.component.scss']
})
export class EditFillinComponent {

  fillinForm: FormGroup;
  thisQuestionType = questionType.FILLIN;
  detailedQuestionData: detailedQuestionDTO | null = null;

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar

  ) {
    this.fillinForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
    }, 0);
  }

  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        if (data.type === questionType.FILLIN) {
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Lückentextaufgabe', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.FILLIN && this.detailedQuestionData) {
      this.fillinForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.freetextQuestion) {
        // TODO: restliche Felder fuellen
      }
    }
  }

}
