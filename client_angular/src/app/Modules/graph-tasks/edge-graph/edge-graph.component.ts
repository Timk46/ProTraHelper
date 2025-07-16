import { Component, Input } from '@angular/core';
import { IGraphEdge } from '../models/GraphEdge.interface';
import {
  calculateArrowPoints,
  calculateEdgeStart,
  calculateEdgeEnd,
  calculateSelfLoopPath,
} from '../utils';

@Component({
  selector: 'g[app-edge-graph]',
  templateUrl: './edge-graph.component.html',
  styleUrls: ['./edge-graph.component.scss'],
})
export class EdgeGraphComponent {
  // #############################
  // Expose the enums to the template
  public calculateArrowPoints = calculateArrowPoints;
  public calculateEdgeStart = calculateEdgeStart;
  public calculateEdgeEnd = calculateEdgeEnd;
  public calculateSelfLoopPath = calculateSelfLoopPath;

  // #############################
  // Inputs from parent component
  @Input() edge!: IGraphEdge;
  @Input() reverseEdgeState!: 0 | 1 | 2;

  // #############################
  // Constructor
  constructor() {}
}
