import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GradingUploadComponent } from './grading-upload/grading-upload.component';

const routes: Routes = [
  {
    path: ':questionId',
    component: GradingUploadComponent
  },
  {
    path: '',
    component: GradingUploadComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GradingRoutingModule { }
