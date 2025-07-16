import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PeerReviewDashboardComponent } from './components/peer-review-dashboard/peer-review-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: PeerReviewDashboardComponent
  },
  {
    path: 'dashboard',
    component: PeerReviewDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeerReviewRoutingModule { }