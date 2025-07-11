import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GradingOverviewComponent } from './grading-overview/grading-overview.component';
import { GradingRoutingModule } from './grading-routing.module';
import { GradingUploadComponent } from './grading-upload/grading-upload.component';

@NgModule({
  declarations: [
    GradingOverviewComponent,
    GradingUploadComponent
  ],
  imports: [
    CommonModule,
    GradingRoutingModule
  ]
})
export class GradingModule { }
