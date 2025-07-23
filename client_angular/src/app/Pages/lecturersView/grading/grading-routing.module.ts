import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GradingUploadComponent } from './grading-upload/grading-upload.component';

const routes: Routes = [
  {
    path: 'uploads/:questionId',
    component: GradingUploadComponent
  },
  {
    path: 'uploads',
    component: GradingUploadComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GradingRoutingModule { }
