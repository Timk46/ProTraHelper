import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../Modules/material.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { RhinoLauncherComponent } from './rhino-launcher.component';
import { RhinoLauncherService } from './rhino-launcher.service';
import { HttpClientModule } from '@angular/common/http';
import { TaskSelectionDialogComponent } from '../task-selection-dialog/task-selection-dialog.component';
import { MockQuestionDataService } from 'src/app/Services/question/mock-question-data.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@NgModule({
  declarations: [
    RhinoLauncherComponent,
    TaskSelectionDialogComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    RouterModule.forChild([{ path: '', component: RhinoLauncherComponent }])
  ],
  providers: [
    RhinoLauncherService,
    MockQuestionDataService,
    { provide: QuestionDataService, useClass: MockQuestionDataService }
  ],
  exports: [RhinoLauncherComponent]
})
export class RhinoLauncherModule { }
