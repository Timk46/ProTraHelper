import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-freetext',
  templateUrl: './edit-freetext.component.html',
  styleUrls: ['./edit-freetext.component.scss']
})
export class EditFreetextComponent {

  freeTextForm: FormGroup;

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  constructor(
    private fb: FormBuilder,
  ) {
    this.freeTextForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['100', Validators.required],
    });
  }



}
