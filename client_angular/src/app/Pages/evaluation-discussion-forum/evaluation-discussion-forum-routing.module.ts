import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum/evaluation-discussion-forum.component';
import { LoggedInGuard } from '../../Guards/is-logged-in.guard';
import { evaluationAccessGuard } from './guards/evaluation-access.guard';
import { EvaluationDiscussionResolver } from '../../Guards/evaluation-discussion.resolver';

const routes: Routes = [
  {
    path: ':submissionId',
    component: EvaluationDiscussionForumComponent,
    canActivate: [LoggedInGuard, evaluationAccessGuard],
    resolve: { discussions: EvaluationDiscussionResolver } 
  },
  {
    path: '',
    component: EvaluationDiscussionForumComponent, // Allow access without submissionId
    pathMatch: 'full',
    canActivate: [LoggedInGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EvaluationDiscussionForumRoutingModule {}
