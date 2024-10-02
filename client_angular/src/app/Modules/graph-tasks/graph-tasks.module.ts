import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphTasksComponent } from './graph-tasks.component';
import { FormsModule } from '@angular/forms';
import { CdkDrag, DragDropModule } from '@angular/cdk/drag-drop';
import { NodeGraphComponent } from './node-graph/node-graph.component';
import { GraphComponent } from './graph/graph.component';
import { EdgeGraphComponent } from './edge-graph/edge-graph.component';
import { EdgeToolsetGraphComponent } from './edge-toolset-graph/edge-toolset-graph.component';

@NgModule({
  declarations: [
    GraphTasksComponent,
    NodeGraphComponent,
    GraphComponent,
    EdgeGraphComponent,
    EdgeToolsetGraphComponent
  ],
  imports: [
    CommonModule,
    CdkDrag, FormsModule, DragDropModule
  ],
  exports: [
    GraphTasksComponent
  ],
  bootstrap: [GraphTasksComponent],
})

export class GraphTasksModule { }