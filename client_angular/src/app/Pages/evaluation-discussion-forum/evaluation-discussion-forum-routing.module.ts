import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum/evaluation-discussion-forum.component';

const routes: Routes = [
  {
    path: ':submissionId',
    component: EvaluationDiscussionForumComponent,
    // Guards können hier hinzugefügt werden, falls nötig
    // canActivate: [LoggedInGuard, EvaluationAccessGuard]
  },
  {
    path: '',
    component: EvaluationDiscussionForumComponent, // Allow access without submissionId
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EvaluationDiscussionForumRoutingModule {}
