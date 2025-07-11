import type { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import type { ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Component, Input, ViewChild } from '@angular/core';
import type { PositionDTO, GraphConfigurationDTO } from '@DTOs/graphTask.dto';
import type { IGraphNode } from '../models/GraphNode.interface';
import type { GraphTaskService } from '../services/graph-task.service';
import type { IGraphNewEdge } from '../models/GraphNewEdge.interface';
import type { Subscription } from 'rxjs';
import { calculateShapeCenter } from '../utils';

@Component({
  selector: 'app-node-graph',
  templateUrl: './node-graph.component.html',
  styleUrls: ['./node-graph.component.scss'],
})
export class NodeGraphComponent implements OnInit, OnDestroy {
  // #############################
  // References for HTML Elements
  @ViewChild('nodeValueInput') nodeValueInput!: ElementRef<HTMLInputElement>;
  @ViewChild('nodeWeightInput') nodeWeightInput!: ElementRef<HTMLInputElement>;

  // #############################
  // Inputs from parent component
  @Input() node!: IGraphNode;
  @Input() index!: number;

  // #############################
  // Class properties
  nodeZIndex: number;
  displayNodeToolset: boolean;
  editNodeValue: boolean;
  editNodeWeight: boolean;

  private newEdgeSubscription!: Subscription;
  private graphConfigurationSubscription!: Subscription;

  newEdge!: IGraphNewEdge;
  graphConfiguration!: GraphConfigurationDTO;

  // #############################
  // Constructor
  constructor(private readonly graphTaskService: GraphTaskService) {
    // Initalize properties
    this.nodeZIndex = 1;
    this.displayNodeToolset = false;
    this.editNodeValue = false;
    this.editNodeWeight = false;
  }

  // #############################
  // Lifecycle hook methods
  ngOnInit(): void {
    // Activate the input field for the node
    this.activateEditNodeValueInput();

    // #############################
    // Subscribe to Observables from the graphService
    this.newEdgeSubscription = this.graphTaskService.getNewEdge().subscribe(newEdge => {
      this.newEdge = newEdge;
    });

    this.graphConfigurationSubscription = this.graphTaskService
      .getGraphConfiguration()
      .subscribe(graphConfiguration => {
        this.graphConfiguration = graphConfiguration;
      });
  }

  ngOnDestroy(): void {
    // #############################
    // Unsubscribe from all subscriptions to prevent memory leaks
    if (this.newEdgeSubscription) {
      this.newEdgeSubscription.unsubscribe();
    }
    if (this.graphConfigurationSubscription) {
      this.graphConfigurationSubscription.unsubscribe();
    }
  }

  // #############################
  // Functions for interactions with node
  onNodeDoubleClick() {
    this.activateEditNodeValueInput();
  }

  onNodeWeightDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    this.activateEditNodeWeightInput();
  }

  onNodeSelectedDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    this.updateNodeSelected();
  }

  onFieldHover(event: any) {
    // Activate the toolset for the node and adjust z index
    this.displayNodeToolset = true;
    this.nodeZIndex = 10;
  }

  onFieldLeave(event: any) {
    // Deactivate the toolset for the node and adjust z index
    this.displayNodeToolset = false;
    this.nodeZIndex = 1;
  }

  onClick(event: MouseEvent) {
    event.stopPropagation(); // so that the click event is not propagated to the workspace
    // Workspace click event is used to cancel the new edge creation
  }

  // Drag start
  nodeOnDragStart(event: CdkDragStart) {}

  // Drag end
  nodeOnDragEnd(event: CdkDragEnd) {}

  // Drag move
  nodeOnDragMove(event: CdkDragMove) {
    // Update node data (position, center)
    this.node.position.x = event.source.getFreeDragPosition().x;
    this.node.position.y = event.source.getFreeDragPosition().y;
    this.node.center = calculateShapeCenter(this.node.position, this.node.size);
  }

  // #############################
  // Functions for interactions with node toolset
  onNewNodeClick(event: any, isIncoming: boolean | null = null) {
    if (this.graphConfiguration.edgeDirected && isIncoming === null) {
      throw new Error('The edges must be undirected');
    }

    // TODO: Size is not being configured here, instead the default value in the service (100, 100) is being used

    const position: PositionDTO = {
      x: this.node.position.x + 130,
      y: this.node.position.y + 130,
    };

    // Add the node
    const newNode = this.graphTaskService.addNode({ position });

    // Add the edge between this node and new generated
    if (isIncoming) {
      // from newNode to this.node
      this.graphTaskService.addEdge(newNode, this.node);
    } else {
      // from this.node to newNode
      this.graphTaskService.addEdge(this.node, newNode);
    }
  }

  onConnectNodeDirectedClick(event: MouseEvent, isIncoming: boolean) {
    // First node selection
    if (this.newEdge.started === false) {
      this.graphTaskService.updateNewEdge({ started: true });

      // Incoming edge - ends at current node
      if (isIncoming) {
        this.graphTaskService.updateNewEdge({ node2: this.node });
      }

      // Outgoing edge - originates from current node
      else {
        // Check if the child role is provided
        this.graphTaskService.updateNewEdge({ node1: this.node });
      }
    }

    // Second node selection
    else {
      // TODO: Can an edge points to two nodes at the same time or should be another edge created for this?
      // Check if the edge already points to another node
      if (isIncoming && this.newEdge.node2 !== null) {
        throw new Error('The Edge already points to another node.');
      }

      // Check if the edge already originates from another node
      if (!isIncoming && this.newEdge.node1 !== null) {
        throw new Error('The Edge already originates from another node.');
      }

      // Incoming edge - ends at current node
      if (isIncoming) {
        this.graphTaskService.updateNewEdge({ node2: this.node });
      }

      // Outgoing edge - originates from current node
      else {
        // Check if the child role is provided
        this.graphTaskService.updateNewEdge({ node1: this.node });
      }

      // Add new edge
      try {
        if (this.newEdge.node1 !== null && this.newEdge.node2 !== null) {
          this.graphTaskService.addEdge(
            this.newEdge.node1,
            this.newEdge.node2,
            this.newEdge.weight,
          );
        }
      } catch (err) {
        console.error(err);
      }

      // Reset new link for future use
      this.graphTaskService.resetNewEdge();
    }
  }

  onConnectNodeUndirectedClick(event: MouseEvent) {
    // First node selection
    if (this.newEdge.started === false) {
      this.graphTaskService.updateNewEdge({ started: true, node1: this.node });
    }
    // Second node selection
    else {
      this.graphTaskService.updateNewEdge({ node2: this.node });

      // Add new edge
      try {
        if (this.newEdge.node1 !== null && this.newEdge.node2 !== null) {
          this.graphTaskService.addEdge(
            this.newEdge.node1,
            this.newEdge.node2,
            this.newEdge.weight,
          );
        }
      } catch (err) {
        console.error(err);
      }

      // Reset new link for future use
      this.graphTaskService.resetNewEdge();
    }
  }

  onDeleteNodeClick(event: any) {
    this.graphTaskService.removeNode(this.node);
  }

  activateEditNodeValueInput() {
    this.editNodeValue = true;

    // Ensure that the input element is mounted
    setTimeout(() => {
      this.nodeValueInput.nativeElement.focus();
    }, 0);
  }

  activateEditNodeWeightInput() {
    this.editNodeWeight = true;
    if (this.node.weight.value === Number.MAX_SAFE_INTEGER) {
      this.node.weight.value = null;
    }

    // Ensure that the input element is mounted
    setTimeout(() => {
      this.nodeWeightInput.nativeElement.focus();
    }, 0);
  }

  updateNodeValue(event: any) {
    const newValue = event.target.value;
    this.graphTaskService.updateNode(this.node, { value: newValue });
  }

  updateNodeWeight(event: any) {
    let intValue = Number(event.target.value);
    intValue = isNaN(intValue) ? 0 : intValue;

    this.graphTaskService.updateNode(this.node, { weight: { enabled: true, value: intValue } });
  }

  updateNodeSelected() {
    if (this.node.selected.value !== null) {
      const current: boolean = this.node.selected.value;
      this.graphTaskService.updateNode(this.node, { selected: { enabled: true, value: !current } });
    }
  }

  setWeightInfinity(): void {
    this.node.weight.value = Number.MAX_SAFE_INTEGER;
    this.editNodeWeight = false;
  }

  getWeightDisplayValue(): string | number {
    const intValue = Number(this.node.weight.value);
    const weightValue = isNaN(intValue) ? 0 : intValue;

    return weightValue === Number.MAX_SAFE_INTEGER ? '∞' : weightValue;
  }
}
