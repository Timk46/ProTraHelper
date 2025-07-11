import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GradingOverviewComponent } from './grading-overview/grading-overview.component';

const routes: Routes = [
  {
    path: ':questionId',
    component: GradingOverviewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GradingRoutingModule { }
