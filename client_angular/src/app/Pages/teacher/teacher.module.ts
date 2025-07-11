import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GradingOverviewComponent } from './grading-overview/grading-overview.component';
import { TeacherRoutingModule } from './teacher-routing.module';

@NgModule({
  declarations: [GradingOverviewComponent],
  imports: [CommonModule, TeacherRoutingModule],
})
export class TeacherModule {}
