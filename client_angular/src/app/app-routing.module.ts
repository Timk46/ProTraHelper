import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentComponent } from './Pages/content/content.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { ContentOverviewComponent } from './Pages/contentOverview/contentOverview.component';
import { DiscussionComponent } from './Pages/discussion/discussion.component';
import { CodeTaskComponent } from './Pages/content/codeTask/codeTask.component';
import { InstructionComponent } from './Pages/content/instruction/instruction.component';
import { McQuizComponent } from './Pages/content/mcQuiz/mcQuiz.component';
import { GraphComponent } from './Pages/graph/graph.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'app', component: AppComponent },
  { path: 'content', component: ContentComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'contentOverview', component: ContentOverviewComponent },
  { path: 'discussion', component: DiscussionComponent },
  { path: 'codeTask', component: CodeTaskComponent },
  { path: 'instruction/:id', component: InstructionComponent },
  { path: 'mcQuiz', component: McQuizComponent },
  { path: 'graph', component: GraphComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
