import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GradingRoutingModule } from './grading-routing.module';
import { GradingUploadComponent } from './grading-upload/grading-upload.component';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    GradingUploadComponent
  ],
  imports: [
    CommonModule,
    GradingRoutingModule,
    MatButtonModule
  ]
})
export class GradingModule { }
