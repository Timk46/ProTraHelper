import { Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { QuestionDTO, questionType } from '@DTOs/question.dto';
import { ReplaySubject, Subject, takeUntil } from 'rxjs';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';

@Component({
  selector: 'app-create-content-element-dialog',
  templateUrl: './create-content-element-dialog.component.html',
  styleUrls: ['./create-content-element-dialog.component.scss'],
})
export class CreateContentElementDialogComponent {
  creationForm: FormGroup;
  connectionForm: FormGroup;
  questionTypes = questionType;

  activeTab: 'new' | 'existing' = 'new';

  unlinkedQuestions: QuestionDTO[] = [];
  filteredQuestions: ReplaySubject<QuestionDTO[]> = new ReplaySubject<QuestionDTO[]>(1);
  questionFilterControl = new FormControl('');
  private _onDestroy = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<CreateContentElementDialogComponent>,
    private fb: FormBuilder,
    private contentLinkerService: ContentLinkerService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.creationForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionType: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['100', Validators.required],
      contentElementTitle: [''],
      contentElementDescription: [''],
      contentElementPosition: [''],
    });
    this.connectionForm = this.fb.group({
      questionId: ['', Validators.required],
      contentElementTitle: [''],
      contentElementDescription: [''],
      contentElementPosition: [''],
    });
  }

  ngOnInit() {
    this.contentLinkerService.getUnlinkedQuestions().subscribe((questions) => {
      this.unlinkedQuestions = questions;
      this.filteredQuestions.next(this.unlinkedQuestions.slice());
    });

    this.questionFilterControl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterQuestions();
      });
  }

  onSelectClick() {
    this.filterQuestions();
  }

  private filterQuestions() {
    if (!this.unlinkedQuestions) {
      return;
    }
    let search = this.questionFilterControl.value;
    if (!search) {
      this.filteredQuestions.next(this.unlinkedQuestions.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredQuestions.next(
      this.unlinkedQuestions.filter(question => question.name!.toLowerCase().indexOf(search!) > -1)
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Handles the form submission.
   * If the active tab is 'new', checks if the creation form is valid and closes the dialog with the form value.
   * If the active tab is not 'new', checks if the connection form is valid and closes the dialog with the form value.
   * If the form is not valid, marks all form controls as touched.
   */
  onSubmit(): void {
    if (this.activeTab === 'new') {
      if (this.creationForm.valid) {
        this.dialogRef.close(this.creationForm.value);
      } else {
        this.creationForm.markAllAsTouched();
      }
    } else {
      if (this.connectionForm.valid) {
        this.dialogRef.close(this.connectionForm.value);
      } else {
        this.connectionForm.markAllAsTouched();
      }
    }
  }

  /**
   * Handles the tab change event.
   *
   * @param event - The tab change event object.
   */
  onTabChange(event: any) {
    this.activeTab = event.index === 0 ? 'new' : 'existing';
  }
}
