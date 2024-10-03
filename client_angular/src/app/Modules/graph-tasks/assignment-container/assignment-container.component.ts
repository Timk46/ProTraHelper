import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { IGraphDataJSON } from '../models/GraphDataJSON.interface';
import { IGraphConfiguration } from '../models/GraphConfiguration.interface';
import { GraphTaskService } from '../services/graph-task.service';
import IAssignment from '../models/Assignment.interface';


@Component({
  selector: 'app-assignment-container',
  templateUrl: './assignment-container.component.html',
  styleUrls: ['./assignment-container.component.scss']
})
export class AssignmentContainerComponent implements OnInit {

  public workspaceModePrevious: string = 'assignment';
  public workspaceModeCurrent: string = 'assignment';
  public solutionStepPrevious: number = 0;
  public solutionStepCurrent: number = 0;

  //public assignment$!: Observable<IAssignment | undefined>;
  public assignment: IAssignment | null = null;

  assignmentGraphStructure: IGraphDataJSON = {
    nodes: [], edges: []
  };

  public solutionGraph: IGraphDataJSON[] = [];

  // public feedback$!: Observable<string>;
  public feedback: string = 'feedback';

  constructor(
    private graphTaskService: GraphTaskService,
    private route: ActivatedRoute
  ) {

  }

  ngOnInit(): void {
    // get assignment id from url
    const idStr = this.route.snapshot.paramMap.get('id') || '-1';
    const id = parseInt(idStr);

    // reset the state of the graph service
    this.graphTaskService.resetGraph();

    
    // TODO: get feedback observable and subscribe
    // this.feedback$ = 
    // this.feedback$.subscribe( data => { this.feedback = data }) 

    // TODO: get question details
    // this.assignment$ =

    // this.assignment$.subscribe((assignment) => {

    //   if (assignment) {
    //     // set the state of the graph and bst

    //     // TODO: Find a proper solution to prevent this
    //     // added this line to use only values from the assignment and not to overwrite the assignment content from service
    //     // e.g. position atribute is being overwritten when using assignment object directly
    //     const clonedAssignment: IAssignment = JSON.parse(JSON.stringify(assignment));
    //     this.assignment = clonedAssignment;

    //     this.assignmentGraphStructure = this.assignment?.initialStructure

    //     this.updateWorkspace();
    //   }
    // })

    // TODO: For now, using dummy assignment data:
    const dummy_assignment_data: IAssignment = {
      id: 0,
      title: "Dijkstra",
      text: "Dijkstra",
      stepsEnabled: true,
      dataStructure: "graph",
      type: "dijkstra",
      maxPoints: 100,
      initialStructure: {
        "nodes": [
          {
            "nodeId": 0,
            "value": "A",
            "position": {
              "x": 151,
              "y": 103.19999837875366
            },
            "size": {
              "width": 100,
              "height": 100
            },
            "center": {
              "x": 201,
              "y": 153.19999837875366
            },
            "visited": false,
            "weight": 0
          },
          {
            "nodeId": 1,
            "value": "B",
            "position": {
              "x": 392,
              "y": 104.19999837875366
            },
            "size": {
              "width": 100,
              "height": 100
            },
            "center": {
              "x": 442,
              "y": 154.19999837875366
            },
            "visited": false,
            "weight": 1
          },
          {
            "nodeId": 2,
            "value": "C",
            "position": {
              "x": 625,
              "y": 104.19999837875366
            },
            "size": {
              "width": 100,
              "height": 100
            },
            "center": {
              "x": 675,
              "y": 154.19999837875366
            },
            "visited": false,
            "weight": 9007199254740991
          }
        ],
        "edges": [
          {
            "node1Id": 0,
            "node2Id": 1,
            "weight": 1
          },
          {
            "node1Id": 1,
            "node2Id": 2,
            "weight": 3
          }
        ]
      },
      expectedSolution: [],
      graphConfiguration: {
        "nodeWeight": true,
        "nodeVisited": true,
        "edgeWeight": true,
        "edgeDirected": false
      }
    }
    const clonedAssignment: IAssignment = JSON.parse(JSON.stringify(dummy_assignment_data));
    this.assignment = clonedAssignment;

    // TODO: ##############
    // TODO: Temporary placeholder function for type checking. 
    // This function always return true and should be replaced with 
    // proper type guards to validate IGraphDataJSON structure.
    function isGraphStructure(obj: any): obj is IGraphDataJSON {
      return true
    }

    if (this.assignment.dataStructure === 'graph' && isGraphStructure(this.assignment.initialStructure)) {
      this.assignmentGraphStructure = this.assignment?.initialStructure;
    }
    else {
      this.assignmentGraphStructure = { nodes: [], edges: [] };
    }

    this.updateWorkspace();
  }

  onSubmitButtonClick() {

    // To save workspace content if it is in solution mode
    this.updateWorkspace();
    
    // TODO: Submit Solution
    alert('Abgabe der Lösung wurde noch nicht implementiert.')

  }

  addNewSolutionStep() {
    // Before adding new step, the current step need to be saved
    if (this.workspaceModePrevious === 'solution'){
      this.saveWorkspaceContent();
    }

    // ###
    // Add new solution step

    // Use the data of the last step for the new step if exists ; else use assignment data
    let last: IGraphDataJSON;

    const numberOfSolutionSteps = this.solutionGraph.length;

    if (numberOfSolutionSteps !== 0) {
      last = this.solutionGraph[numberOfSolutionSteps - 1];
    } 
    else {
      const graphNodes = this.assignmentGraphStructure.nodes;
      const graphEdges = this.assignmentGraphStructure.edges;
      if (graphNodes !== undefined && graphEdges !== undefined) {
        last = {
          nodes: graphNodes,
          edges: graphEdges
        }
      } else {
        last = {
          nodes: [],
          edges: []
        };
      }
    }
    
    // Clone the data to use values and not references
    const cloned = JSON.parse(JSON.stringify(last));

    // Add it to the solution steps
    this.solutionGraph.push(cloned);

    // Set the current step
    this.solutionStepCurrent = this.solutionGraph.length - 1;
    this.solutionStepPrevious = this.solutionStepCurrent;

    // call updateWorkspace function for other needed updates required related to the step change
    this.updateWorkspace();
  }
  


  updateWorkspace() {

    // If workspace was in solution mode before update
    if (this.workspaceModePrevious === 'solution') {
      
      // Save the previous content before resetting it
      this.saveWorkspaceContent();
    }

    // Load solution to the workspace
    if (this.workspaceModeCurrent === 'solution') {
      
      // If there is no step yet, add the first step
      if (this.solutionGraph.length === 0) {
        this.addNewSolutionStep()
      }

      // Get Current Step
      const graphContent: IGraphDataJSON = this.solutionGraph[this.solutionStepCurrent];

      // TODO: Find a proper solution to prevent this
      // added this line to use only values and not the references
      const clonedGraphContent: IGraphDataJSON = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({ graphStructure: clonedGraphContent, graphConfiguration: this.assignment?.graphConfiguration! });
    } 

    // Load assignment to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {

      // No configuration
      if (!this.assignment?.graphConfiguration) {
        alert('Keine Konfiguration für Graph gefunden.');
        return
      }

      // Load content and configuration
      this.loadWorkspaceContent({
        graphStructure: JSON.parse(JSON.stringify(this.assignmentGraphStructure)),
        graphConfiguration: this.assignment?.graphConfiguration
      })    

    }

    // Update the previous mode for the future changes
    this.workspaceModePrevious = this.workspaceModeCurrent;
    this.solutionStepPrevious = this.solutionStepCurrent;
  }

  loadWorkspaceContent(params: {
    graphStructure?: IGraphDataJSON,
    graphConfiguration?: IGraphConfiguration
  }
  ) {

    let { graphStructure, graphConfiguration } = params;

      // Reset
      this.graphTaskService.resetGraph();

      if (graphConfiguration) {
        // TODO: does configuration need to set here or better somewhere else?
        this.graphTaskService.configureGraph(graphConfiguration);
      }

      // Set data
      if (graphStructure === undefined || graphStructure === null) {
        graphStructure = { nodes: [], edges: [] }
      }
      this.graphTaskService.graphDataFromJSON(graphStructure.nodes, graphStructure.edges);
  }

  saveWorkspaceContent() {

    const graphDataJSON = this.graphTaskService.graphToJSON();
    this.solutionGraph[this.solutionStepPrevious] = graphDataJSON;

  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }
}
