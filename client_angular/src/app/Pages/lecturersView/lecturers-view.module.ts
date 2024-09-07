import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../Modules/material.module';
import { TutorKaiModule } from '../../Modules/tutor-kai/tutor-kai.module';
import { EditorModule } from '@tinymce/tinymce-angular';

import { CreateContentNodeDialogComponent } from './create-content-node-dialog/create-content-node-dialog.component';
import { CreateContentElementDialogComponent } from './create-content-element-dialog/create-content-element-dialog.component';
import { EditFreetextComponent } from './edit-freetext/edit-freetext.component';
import { EditChoiceComponent } from './edit-choice/edit-choice.component';
import { EditFillinComponent } from './edit-fillin/edit-fillin.component';
import { EditCodingComponent } from './edit-coding/edit-coding.component';
import { TinymceComponent } from '../tinymce/tinymce.component';

@NgModule({
  declarations: [
    CreateContentNodeDialogComponent,
    CreateContentElementDialogComponent,
    EditFreetextComponent,
    EditChoiceComponent,
    EditFillinComponent,
    EditCodingComponent,
    TinymceComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TutorKaiModule,
    EditorModule
  ],
  exports: [
    CreateContentNodeDialogComponent,
    CreateContentElementDialogComponent,
    EditFreetextComponent,
    EditChoiceComponent,
    EditFillinComponent,
    EditCodingComponent,
    TinymceComponent
  ]
})
export class LecturersViewModule { }
