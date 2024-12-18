import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {WorkspaceComponent} from "./sites/workspace/workspace.component";

const routes: Routes = [
  {
    path: 'code-game/:taskId',
    component: WorkspaceComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CodeGameRoutingModule { }
