import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../Modules/material.module';
import { TutorKaiModule } from '../../Modules/tutor-kai/tutor-kai.module';
import { EditorModule } from '@tinymce/tinymce-angular';
import { MarkdownModule } from 'ngx-markdown';
import { CreateContentNodeDialogComponent } from './create-content-node-dialog/create-content-node-dialog.component';
import { CreateContentElementDialogComponent } from './create-content-element-dialog/create-content-element-dialog.component';
import { EditFreetextComponent } from './edit-freetext/edit-freetext.component';
import { EditFillinComponent } from './edit-fillin/edit-fillin.component';
import { EditCodingComponent } from './edit-coding/edit-coding.component';
import { EditChoiceComponent } from './edit-choice/edit-choice.component';
import { EditGraphComponent } from './edit-graph/edit-graph.component';
import { AddElementModalComponent } from './edit-coding/add-element-modal.component';
import { TinymceComponent } from '../tinymce/tinymce.component';
import { ScoreComponent } from './edit-choice/score/score.component';
import { DescriptionDialogComponent } from './edit-choice/description-dialog/description-dialog.component';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { EditBlankComponent } from './edit-fillin/edit-blank/edit-blank.component';
import { ImageUploadDialogComponent } from './edit-fillin/image-upload-dialog/image-upload-dialog.component';
import { GraphTasksModule } from 'src/app/Modules/graph-tasks/graph-tasks.module';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { EditCodeGameComponent } from './edit-code-game/edit-code-game.component';
import { CodeGameAddElementModalComponent } from "./edit-code-game/code-game-add-element-modal.component";
import { CodeGameModule } from "../../Modules/code-game/code-game.module";

@NgModule({
  declarations: [
    CreateContentNodeDialogComponent,
    CreateContentElementDialogComponent,
    EditFreetextComponent,
    EditChoiceComponent,
    ScoreComponent,
    DescriptionDialogComponent,
    EditFillinComponent,
    EditBlankComponent,
    ImageUploadDialogComponent,
    EditCodingComponent,
    EditGraphComponent,
    AddElementModalComponent,
    TinymceComponent,
    EditCodeGameComponent,
    CodeGameAddElementModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TutorKaiModule,
    EditorModule,
    MarkdownModule.forChild(),
    NgxMatSelectSearchModule,
    MatSelectModule,
    MatFormFieldModule,
    GraphTasksModule,
    MatButtonToggleModule,
    CodeGameModule
  ],
  exports: [
    CreateContentNodeDialogComponent,
    CreateContentElementDialogComponent,
    EditFreetextComponent,
    EditChoiceComponent,
    EditFillinComponent,
    EditCodingComponent,
    EditGraphComponent,
    TinymceComponent
  ]
})
export class LecturersViewModule { }
