
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentWorkspaceComponent } from './sites/student-workspace/student-workspace.component';

const routes: Routes = [
  {path: 'code', component: StudentWorkspaceComponent},

];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TutorKaiRoutingModule { }
