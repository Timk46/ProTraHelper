import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditorComponent } from './pages/editor/editor.component';
import { TaskWorkspaceComponent } from './pages/task-workspace/task-workspace.component';
// Fügen Sie weitere Komponentenimporte hier ein

const routes: Routes = [
  { path: 'editor', component: EditorComponent },
  { path: 'task-workspace/:taskId', component: TaskWorkspaceComponent },
  // Definieren Sie weitere Routen hier
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UmlearnRoutingModule { }
