import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { GraphTaskService } from '../services/graph-task.service';
import { CdkDrag, CdkDragEnd, CdkDragMove, CdkDragStart, DragDropModule } from '@angular/cdk/drag-drop';
import { NodeGraphComponent } from '../node-graph/node-graph.component';
import { IGraphNode } from '../models/GraphNode.interface';
import { IGraphEdge } from '../models/GraphEdge.interface';
import { IGraphNewEdge } from '../models/GraphNewEdge.interface';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { readFile } from '../utils';
import { SizeDTO, PositionDTO, RectangleDTO, GraphConfigurationDTO } from '@DTOs/graphTask.dto';

@Component({
  selector: 'app-graph-structure',
  templateUrl: './graph-structure.component.html',
  styleUrls: ['./graph-structure.component.scss']
})
export class GraphStructureComponent  implements OnInit, AfterViewInit, OnDestroy {

  // #############################
  // References for HTML Elements
  @ViewChild('workspace') workspace!: ElementRef;
  @ViewChildren('tool') toolElements!: QueryList<ElementRef>;
  @ViewChild('toolbar') toolbar!: ElementRef;
  @ViewChildren(NodeGraphComponent) nodeComponents!: QueryList<NodeGraphComponent>;

  // #############################
  // Class properties
  dragPosition: PositionDTO;
  wsRelativeToTb: PositionDTO;
  workspaceRect: RectangleDTO;
  toolbarRect: RectangleDTO;
  // TODO: Find a proper way to listen to UI change to update workSpaceRect etc. 

  mouseX: number;
  mouseY: number;

  toolbarElements!: string[];
  
  private nodesSubscription!: Subscription;
  private edgesSubscription!: Subscription;
  private newEdgeSubscription!: Subscription;
  private graphConfigurationSubscription!: Subscription;
  
  nodes!: IGraphNode[];
  edges!: IGraphEdge[];
  newEdge!: IGraphNewEdge;
  graphConfiguration!: GraphConfigurationDTO;
  
  private _toolbarEnabled: boolean = false;

  @Input()
  set toolbarEnabled(value: boolean | undefined) {
    this._toolbarEnabled = value ?? this._toolbarEnabled;
  }

  get toolbarEnabled(): boolean {
    return this._toolbarEnabled;
  }

  // #############################
  // Constructor
  constructor( 
    private graphService: GraphTaskService,
    private router: Router
  ) { 
    
    // #############################
    // Initialize Properties
    this.dragPosition = { x: 0, y:0 };
    this.wsRelativeToTb =  { x: 0, y: 0 };
    this.workspaceRect = { 
      topLeft: { x: 0, y: 0},  
      bottomRight: { x: 0, y: 0},
      size: { width: 0, height: 0 }
    }
    this.toolbarRect = { 
      topLeft: { x: 0, y: 0},  
      bottomRight: { x: 0, y: 0},
      size: { width: 0, height: 0 }
    }

    this.mouseX = 0;
    this.mouseY = 0;
  }


  // #############################
  // Lifecycle hook methods

  ngOnInit(): void {

    // #############################
    // Initialize properties
    this.toolbarElements = ["Toolbar1"];  // TODO:
  
    // #############################
    // Subscribe to Observables from the graphService
    this.nodesSubscription = this.graphService.getNodes().subscribe( nodes => {
      this.nodes = nodes;
    });
    
    this.edgesSubscription = this.graphService.getEdges().subscribe( edges => {
      this.edges = edges;
    });
    
    this.newEdgeSubscription = this.graphService.getNewEdge().subscribe( newEdge => {
      this.newEdge = newEdge;
    });

    this.graphConfigurationSubscription = this.graphService.getGraphConfiguration().subscribe( graphConfiguration => {
      this.graphConfiguration = graphConfiguration;
    });

    // #############################
    // Set up event listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('scroll', this.onWindowScroll, true);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.calculateUI();
    }, 0);  
  }

  ngOnDestroy() {
    // #############################
    // Remove event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('scroll', this.onWindowScroll, true);
    
    // #############################
    // Unsubscribe from all subscriptions to prevent memory leaks
    if (this.nodesSubscription) {
      this.nodesSubscription.unsubscribe();
    }
    if (this.edgesSubscription) {
      this.edgesSubscription.unsubscribe();
    }
    if (this.newEdgeSubscription) {
      this.newEdgeSubscription.unsubscribe();
    }
    if (this.graphConfigurationSubscription) {
      this.graphConfigurationSubscription.unsubscribe();
    }
  }

  // #############################
  // Callback functions for event listeners
  private onKeyDown = (event: KeyboardEvent) => {
    // to cancel new edge between nodes
    if (event.key === 'Escape') {
      if (this.newEdge.started) { this.graphService.resetNewEdge(); } 
    }
  }

  private onWindowResize = () => {
    this.calculateUI();
  }

  private onWindowScroll = () => {
    this.calculateUI();
  }

  // #############################
  // Functions for children events
  removeEdge(index: number) {
    const edgeToDelete = this.edges[index];
    this.graphService.removeEdge(edgeToDelete);
  }

  changeEdgeDirection(index: number) {
    const edgeToUpdate = this.edges[index];
    try {
      this.graphService.changeEdgeDirection(edgeToUpdate);
    } catch (err) { console.error(err); } 
    
  }

  changeEdgeWeight(input :{ edgeIndex: number, newWeight: number }) {
    try {
      const edgeToUpdate = this.edges[input.edgeIndex];
      this.graphService.updateEdgeWeight(edgeToUpdate, input.newWeight);
    } catch (err) { console.error(err); } 
    
  }


  // #############################
  // Functions for interactions with UI

  notImplemented() {
    alert('Noch nicht implementiert')
  }

  onJSONToConsoleClick() {
    const json = this.graphService.graphToJSON();
    console.log(json);
  }

  onDownloadAsJSONClick() {
    this.graphService.downloadGraphAsJSON();
  }

  onJSONFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      readFile(file)
      .then( (fileContent) => {
        this.graphService.graphFromJSON(fileContent);
      })  
    }
  }


  // #############################
  // Functions for interactions with toolbar
  
  // Drag start
  toolOnDragStart(event: any) {
    // TODO: where to do this?
    this.calculateUI()
  } 

  // Drag move
  toolOnDragMove(event: any) {

    // Update dragPosition
    this.dragPosition.x = event.source.getFreeDragPosition().x + event.source.element.nativeElement.offsetLeft - this.wsRelativeToTb.x;
    this.dragPosition.y = event.source.getFreeDragPosition().y + + event.source.element.nativeElement.offsetTop - this.wsRelativeToTb.y;
  }

  // Drag end
  toolOnDragEnd(event: any) {

    // TODO: 
    this.calculateUI()

    // TODO: how to set size dynamically?
    const newNodeSize: SizeDTO = {
      width: 100,
      height: 100
      // width: event.source.element.nativeElement.clientWidth,
      // height: event.source.element.nativeElement.clientHeight
    }

    // Get the drag point to set the size of new node
    const newNodePosition: PositionDTO = {
      x: event.source.getFreeDragPosition().x + event.source.element.nativeElement.offsetLeft - this.wsRelativeToTb.x,
      y: event.source.getFreeDragPosition().y + + event.source.element.nativeElement.offsetTop - this.wsRelativeToTb.y
    }

    // Check if the position is inside the workspace and adjust it if it is not
    if (newNodePosition.x < 0) { 
      newNodePosition.x = 0
    } else if (newNodePosition.x + newNodeSize.width > this.workspaceRect.size.width) { 
      newNodePosition.x = this.workspaceRect.size.width - newNodeSize.width
    }

    if (newNodePosition.y < 0) { 
      newNodePosition.y = 0
    } else if (newNodePosition.y + newNodeSize.height > this.workspaceRect.size.height) { 
      newNodePosition.y = this.workspaceRect.size.height - newNodeSize.height
    }

    // Reset the Toolbar Element
    event.source.reset()

    // TODO: node is returned
    this.graphService.addNode({ position: newNodePosition, size: newNodeSize })
  }

  // #############################
  // Functions for interactions with workspace
  
  onWorkspaceClick(event: MouseEvent) {
    // Cancel the new edge creation if workspace is clicked
    // Used stop event propogation on node click 
    if (this.newEdge.started) {
      this.graphService.resetNewEdge();
    }
  }

  onMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }


  // #############################
  // Utility functions

  calculateUI() {
    // Check if the UI elements initialized
    if (this.workspace && this.toolbar) {

      // Calculate Workspace rectangle
      const { 
        x: wX, y: wY, 
        width: wWidth, height: wHeight,
       } = this.workspace.nativeElement.getBoundingClientRect();

      this.workspaceRect = { 
        topLeft: { x: wX, y: wY },
        bottomRight: { x: wX + wWidth, y: wY + wHeight },
        size: { width: wWidth, height: wHeight }
      }

      // Calculate Toolbar rectangle
      const { x: tX, y: tY, width: tWidth, height: tHeight } = this.toolbar.nativeElement.getBoundingClientRect();
      this.toolbarRect = { 
        // topLeft: { x: tX, y: tY },
        topLeft: { x: tX, y: tY },
        bottomRight: { x: tX + tWidth, y: tY + tHeight },
        size: { width: tWidth, height: tHeight }
      }

      // Calculate the differences
      const xDifference = this.workspaceRect.topLeft.x - this.toolbarRect.topLeft.x;
      const yDifference = this.workspaceRect.topLeft.y - this.toolbarRect.topLeft.y;

      // Update the difference property
      this.wsRelativeToTb = { x: xDifference, y: yDifference };
    }
  }

  navigateToRoute(route: string): void {
    this.router.navigate([route]);
  }

  trackByIndex(index: number, obj: any): any {
    return index; // or obj.id if each edge has a unique id
  }

  getReverseEdgeState(edge: IGraphEdge): 0 | 1 | 2 {
    // Check if the graph contains directed edges
    if (!this.graphConfiguration.edgeDirected) { return 0; } 

    const reverseEdge: IGraphEdge | undefined = this.edges.find(e => e.node1 === edge.node2 && e.node2 === edge.node1);
    
    // There is no reverse edge
    if (!reverseEdge) { return 0; }

    // The reverse edge source node has smaller id than the target node
    if (reverseEdge.node1.nodeId < reverseEdge.node2.nodeId) { return 1; }

    // The reverse edge source node has greater id than the target node
    // if (reverseEdge.node1.nodeId > reverseEdge.node2.nodeId) 
    return 2;
  }
}
