import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PmpmOverlayComponent } from './components/pmpm-overlay/pmpm-overlay.component';
import { CoursePmpmIntegrationComponent } from './components/course-integration/course-pmpm-integration.component';

const routes: Routes = [
  {
    path: 'courses/:courseId/lesson/:lessonId/pmpm/:modelId',
    component: PmpmOverlayComponent
  },
  {
    path: 'courses/:courseId/lesson/:lessonId/model',
    component: CoursePmpmIntegrationComponent
  },
  {
    path: 'courses/:courseId/lesson/:lessonId/review/:modelId',
    component: CoursePmpmIntegrationComponent,
    data: { taskType: 'review' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PmpmRoutingModule { }
