import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GradingOverviewComponent } from './grading-overview/grading-overview.component';
import { GradingRoutingModule } from './grading-routing.module';
import { GradingUploadComponent } from './grading-upload/grading-upload.component';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    GradingOverviewComponent,
    GradingUploadComponent
  ],
  imports: [
    CommonModule,
    GradingRoutingModule,
    MatButtonModule
  ]
})
export class GradingModule { }
