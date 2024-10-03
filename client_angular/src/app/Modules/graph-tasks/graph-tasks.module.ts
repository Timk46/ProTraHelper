import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphTasksComponent } from './graph-tasks.component';
import { FormsModule } from '@angular/forms';
import { CdkDrag, DragDropModule } from '@angular/cdk/drag-drop';
import { NodeGraphComponent } from './node-graph/node-graph.component';
import { GraphStructureComponent } from './graph-structure/graph-structure.component';
import { EdgeGraphComponent } from './edge-graph/edge-graph.component';
import { EdgeToolsetGraphComponent } from './edge-toolset-graph/edge-toolset-graph.component';
import { AssignmentContainerComponent } from './assignment-container/assignment-container.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@NgModule({
  declarations: [
    GraphTasksComponent,
    NodeGraphComponent,
    GraphStructureComponent,
    EdgeGraphComponent,
    EdgeToolsetGraphComponent,
    AssignmentContainerComponent
  ],
  imports: [
    CommonModule,
    CdkDrag, FormsModule, DragDropModule, MatButtonToggleModule
  ],
  exports: [
    GraphTasksComponent,
    GraphStructureComponent
  ],
  bootstrap: [GraphTasksComponent],
})

export class GraphTasksModule { }