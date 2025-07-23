import { RouterModule, Routes } from "@angular/router";
import { LecturersViewComponent } from "./lecturers-view.component";
import { NgModule } from "@angular/core";

const routes: Routes = [
  {
    path: '',
    component: LecturersViewComponent,
    children: [
      {
        path: 'grading',
        loadChildren: () => import('./grading/grading.module').then(m => m.GradingModule)
      },
      {
        path: 'management',
        loadChildren: () => import('./management/management.module').then(m => m.ManagementModule)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LecturersViewRoutingModule { }
