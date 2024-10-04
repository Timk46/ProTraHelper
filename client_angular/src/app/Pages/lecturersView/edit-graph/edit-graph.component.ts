import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import IAssignment from 'src/app/Modules/graph-tasks/models/Assignment.interface';
import { IGraphConfiguration } from 'src/app/Modules/graph-tasks/models/GraphConfiguration.interface';
import { IGraphDataJSON } from 'src/app/Modules/graph-tasks/models/GraphDataJSON.interface';
import { GraphTaskService } from 'src/app/Modules/graph-tasks/services/graph-task.service';
import { readFile } from 'src/app/Modules/graph-tasks/utils';

@Component({
  selector: 'app-edit-graph',
  templateUrl: './edit-graph.component.html',
  styleUrls: ['./edit-graph.component.scss']
})
export class EditGraphComponent {

  // ########################################
  // Component class properties

  // Form related properties 
  form: FormGroup;

  assignmentTypes = [
    'dijkstra', 'floyd', 'kruskal', 'transitive_closure'
  ];

  showCheckbox = true;

  // Workspace related properties
  workspaceIsActive = false;
  structureIsSet = false;
  
  workspaceModePrevious: string = 'assignment';
  workspaceModeCurrent: string = 'assignment';  
  public solutionStepPrevious: number = 0;
  public solutionStepCurrent: number = 0;
  
  assignmentGraphStructure: IGraphDataJSON = {
    nodes: [], edges: []
  };
  solutionGraphStructure: IGraphDataJSON[] = [
  //   {
  //   nodes: [], edges: []
  // }
  ];



  // #######################################################
  // Constructor - Component lifecycle related
  constructor(
    private fb: FormBuilder,
    private graphTaskService: GraphTaskService,
  ) {

    this.form = this.fb.group({
      title: ['', Validators.required],
      stepsEnabled: [false],
      text: ['', Validators.required],
      maxPoints: [100, Validators.required],
      selectedAssignmentType: ['', Validators.required],
      checkboxEdgeDirected: [false],
      checkboxEdgeWeighted: [false],
      checkboxNodeWeighted: [false],
      checkboxNodeVisited: [false]
    });
  }

  ngOnInit(): void {
    this.resetWorkspaceContent();
  }

  // #######################################################
  // Workspace Content Related

  //TODO:
  updateWorkspace() {
    // Save the previous content before resetting it
    this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepPrevious);

    // #####
    // ## CASE 1: Example Solution ->  Load it to the service
    if (this.workspaceModeCurrent === 'solution') {

      // If there is no step yet, add the first step
      if (this.solutionGraphStructure.length === 0) {
        this.addNewSolutionStep()
      }

      // Get Current Step
      const graphContent: IGraphDataJSON = this.solutionGraphStructure[this.solutionStepCurrent];
      
      // Clone the graph content and load it to the GraphService
      const clonedGraphContent: IGraphDataJSON = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({
        graphContent: clonedGraphContent,
        graphConfiguration: {
          nodeVisited: this.form.value.checkboxNodeVisited,
          nodeWeight: this.form.value.checkboxNodeWeighted,
          edgeWeight: this.form.value.checkboxEdgeWeighted,
          edgeDirected: this.form.value.checkboxEdgeDirected,
          }
      });

    }


    // #####
    // ## CASE 2: Initial Structure ->  Load it to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {
      
        // Clone the graph content and load it to the GraphService
        const clonedGraphContent: IGraphDataJSON = JSON.parse(JSON.stringify(this.assignmentGraphStructure));
        this.loadWorkspaceContent({
          graphContent: clonedGraphContent,
          graphConfiguration: {
            nodeVisited: this.form.value.checkboxNodeVisited,
            nodeWeight: this.form.value.checkboxNodeWeighted,
            edgeWeight: this.form.value.checkboxEdgeWeighted,
            edgeDirected: this.form.value.checkboxEdgeDirected,
          }
        });
    }

    // Update the previous mode and previous step for the future changes
    this.workspaceModePrevious = this.workspaceModeCurrent;
    this.solutionStepPrevious = this.solutionStepCurrent;
  }

  //TODO:
  loadWorkspaceContent(params: Partial<{
    graphContent: IGraphDataJSON;
    graphConfiguration: IGraphConfiguration | null
  }>) {

    let {
      graphContent,
      graphConfiguration
    } = params;
    
    // Reset Graph Service to ensure the previous content is removed
    this.graphTaskService.resetGraph();

    // If graph configuration is provided, set it 
    if (graphConfiguration) {
      this.graphTaskService.configureGraph(graphConfiguration);
    } else {
      throw new Error('No Graph Configuration.')
    }

    // Set graph data
    if (graphContent === undefined) {
      graphContent = { nodes: [], edges: [] }
    }
    this.graphTaskService.graphDataFromJSON(graphContent.nodes, graphContent.edges);

  }

  //TODO:
  saveWorkspaceContent(mode: string, step: number) {
    
      
    // graphToJSON returns also the configuration and structureType
    // Use only nodes and edges
    const graph = this.graphTaskService.graphToJSON();
    const graphDataJSON: IGraphDataJSON = { nodes: graph.nodes, edges: graph.edges };

    // Clone GraphService content
    const clonedGraphContent: IGraphDataJSON = JSON.parse(JSON.stringify(graphDataJSON));

    // Update the graph structure according to the mode. It can be initial structure or example solution
    if (mode === 'solution') {
      this.solutionGraphStructure[step] = clonedGraphContent;
    } else if (mode === 'assignment') {
      this.assignmentGraphStructure = clonedGraphContent;
    }
  }

  //TODO:
  activateWorkspace() {
    // Display workspace
    this.workspaceIsActive = true;

    // Indicates that the structure content is not empty
    // To reset structure content in case assignment configuration changes 
    this.structureIsSet = true;


    
    // Get Graph Configuration from form data
    this.graphTaskService.configureGraph({
      nodeVisited: this.form.value.checkboxNodeVisited,
      nodeWeight: this.form.value.checkboxNodeWeighted,
      edgeWeight: this.form.value.checkboxEdgeWeighted,
      edgeDirected: this.form.value.checkboxEdgeDirected, 
    })

    // Clone the graph structure according to the mode. It can be initial structure or example solution
    let clonedGraphContent!: IGraphDataJSON;
    if (this.workspaceModeCurrent === 'assignment') {
      clonedGraphContent = JSON.parse(JSON.stringify(this.assignmentGraphStructure)); 
    } else if (this.workspaceModeCurrent === 'solution') {
      clonedGraphContent = JSON.parse(JSON.stringify(this.solutionGraphStructure[this.solutionStepCurrent])); 
    }

    // Load workspace to the service
    this.loadWorkspaceContent({
      graphContent: clonedGraphContent,
      graphConfiguration: {
        nodeVisited: this.form.value.checkboxNodeVisited,
        nodeWeight: this.form.value.checkboxNodeWeighted,
        edgeWeight: this.form.value.checkboxEdgeWeighted,
        edgeDirected: this.form.value.checkboxEdgeDirected,
        }
    });
    
  }

  deactivateWorkspace() {
    // Hide workspace
    this.workspaceIsActive = false;
    
    // Save recent updated workspace content 
    this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepCurrent);
    
    // Reset the content in service for future use
    this.graphTaskService.resetGraph();
  }

  resetWorkspaceContent() {
    this.structureIsSet = false;

    // Reset Service
    this.graphTaskService.resetGraph();

    // Reset Workspace State
    this.workspaceModePrevious = 'assignment';
    this.workspaceModeCurrent = 'assignment';
    this.solutionStepCurrent = 0;
    this.solutionStepPrevious = 0;
    this.assignmentGraphStructure = {
      nodes: [], edges: []
    };
    this.solutionGraphStructure = [];
  }

  addNewSolutionStep() {
    // Before adding new step, the current step need to be saved
    this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepPrevious);

    // Add new solution

    // Use the data of the last step for the new step if exists ; else use assignment data
    let last: IGraphDataJSON;

    if (this.solutionGraphStructure.length !== 0) {
      last = this.solutionGraphStructure[this.solutionGraphStructure.length - 1];
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
    this.solutionGraphStructure.push(cloned);

    // Set the current step
    this.solutionStepCurrent = this.solutionGraphStructure.length - 1;
    this.solutionStepPrevious = this.solutionGraphStructure.length - 1;
   

    // call updateWorkspace function for other needed updates required related to the step change
    this.updateWorkspace();
  }
  
  // #######################################################
  // Assignment Content Related

  onCreateAssignment(): void {
    let newAssignment: Partial<IAssignment>;
    try {
      newAssignment = this.getFormValuesAsAssignment();
    } catch (err) {
      console.error(err);
      alert(err);
      return;
    }

    // TODO: Submit new assignment data to backend
    console.log(newAssignment);
    alert('Die Erstellung neuer Aufgaben ist noch nicht implementiert.');

  }

  onDownloadAssignmentAsJSON(): void {
    let newAssignment: Partial<IAssignment>;
    try {
      newAssignment = this.getFormValuesAsAssignment();
    } catch (err) {
      console.error(err);
      alert(err);
      return;
    }

    // Download new assignment as json file
    this.downloadJSON(newAssignment, `${newAssignment.title}_assignment`);
  }

  getFormValuesAsAssignment(): Partial<IAssignment> {
    if (!this.form.valid) {
      throw new Error('Form is invalid.');
    }

    const newAssignment: Partial<IAssignment> = {
      title: this.form.value.title,
      text: this.form.value.text,
      stepsEnabled: this.form.value.stepsEnabled,
      dataStructure: 'graph',
      type: this.form.value.selectedAssignmentType,
      maxPoints: this.form.value.maxPoints
    };

    // Set configuration for graph

    newAssignment.initialStructure = {
      nodes: this.assignmentGraphStructure.nodes,
      edges: this.assignmentGraphStructure.edges,
    }

    newAssignment.expectedSolution = this.solutionGraphStructure;
      
    newAssignment.graphConfiguration = {
      nodeWeight: this.form.value.checkboxNodeWeighted,
      nodeVisited: this.form.value.checkboxNodeVisited,
      edgeWeight: this.form.value.checkboxEdgeWeighted,
      edgeDirected: this.form.value.checkboxEdgeDirected,
    }

    return newAssignment;
  }

  importAssignmentFromJSON(jsonString: string): void {
    try {
      this.resetWorkspaceContent();
      
      const assignment: IAssignment = JSON.parse(jsonString);

      // Update form controls
      this.form.patchValue({
        title: assignment.title,
        stepsEnabled: assignment.stepsEnabled,
        text: assignment.text,
        selectedAssignmentType: assignment.type,
        maxPoints: assignment.maxPoints || 100,
        checkboxEdgeDirected: assignment.graphConfiguration?.edgeDirected || false,
        checkboxEdgeWeighted: assignment.graphConfiguration?.edgeWeight || false,
        checkboxNodeWeighted: assignment.graphConfiguration?.nodeWeight || false,
        checkboxNodeVisited: assignment.graphConfiguration?.nodeVisited || false
      });

      const clonedInitialStructure: IGraphDataJSON = JSON.parse(JSON.stringify(assignment.initialStructure))
      this.assignmentGraphStructure = clonedInitialStructure;
        
      const clonedExSolGraphSteps: IGraphDataJSON[] = JSON.parse(JSON.stringify(assignment.expectedSolution))
      this.solutionGraphStructure = clonedExSolGraphSteps;
      this.showCheckbox = true; // Show the checkboxes for graph

      this.structureIsSet = true;

    } catch (err) {
      console.error('Error importing assignment from JSON', err);
      alert('Invalid JSON format');
    }
  }

  onLoadAssignmentFromJSON(event: any): void {
    const file = event.target.files[0];

    if (file) {
      readFile(file)
      .then( (fileContent) => {
        this.importAssignmentFromJSON(fileContent);
      })  
    }
  }

  onChangeAssignmentType(event: any): void {
    const assignmentType = event.target.value;

    if (this.structureIsSet) {
      alert('Der Entwurf wurde zurückgesetzt.')
      this.resetWorkspaceContent();
    }

    // Update form controls according to the assignment type
    if (this.form.value.selectedAssignmentType === 'dijkstra') {
      this.form.patchValue({
        stepsEnabled: true,
        selectedDataStructure: 'graph',
        checkboxEdgeDirected: false,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: true,
        checkboxNodeVisited: true
      });  
      
      this.showCheckbox = true;
    }
    else if (this.form.value.selectedAssignmentType === 'floyd') {
      this.form.patchValue({
        stepsEnabled: true,
        selectedDataStructure: 'graph',
        checkboxEdgeDirected: true,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: false,
        checkboxNodeVisited: true
      });  
      
      this.showCheckbox = true;
    }
    else if (this.form.value.selectedAssignmentType === 'kruskal') {
      this.form.patchValue({
        stepsEnabled: true,
        selectedDataStructure: 'graph',
        checkboxEdgeDirected: false,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: false,
        checkboxNodeVisited: false
      }); 

      this.showCheckbox = true;
    }
    else if (this.form.value.selectedAssignmentType === 'transitive_closure') {
      this.form.patchValue({
        stepsEnabled: false,
        selectedDataStructure: 'graph',
        checkboxEdgeDirected: true,
        checkboxEdgeWeighted: false,
        checkboxNodeWeighted: false,
        checkboxNodeVisited: false
      }); 
      
      this.showCheckbox = true; 
    }
    

  }

  onChangeCheckbox(event: any): void {
    if (this.structureIsSet) {
      alert('Der Entwurf wurde zurückgesetzt.')
      this.resetWorkspaceContent();
    }
  }

  downloadJSON(content: any, fileName: string = 'data') {
    const json = JSON.stringify(content, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    
    // download
    const link = document.createElement('a');
    link.download = `${fileName}.json`;
    link.href = window.URL.createObjectURL(blob);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(link.href);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }
}