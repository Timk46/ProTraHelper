import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { GraphConfigurationDTO, GraphEdgeDTO, GraphNodeDTO, GraphStructureDTO, GraphStructureSemanticDTO } from '@DTOs/graphTask.dto';
import { GraphTaskService } from 'src/app/Modules/graph-tasks/services/graph-task.service';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { GenerateDijkstraService } from './generate-graph/generate-dijkstra.service';
import { GenerateKruskalService } from './generate-graph/generate-kruskal.service';
import { GenerateFloydService } from './generate-graph/generate-floyd.service';
import { GenerateExampleSolutionService } from './generateExampleSolution/generate-example-solution.service';
import { Observable } from 'rxjs';
import { graphEdgeJSONToSemantic, graphJSONToSemantic } from 'src/app/Modules/graph-tasks/utils';


interface GraphQuestionConfiguration extends GraphConfigurationDTO {
  stepsEnabled: boolean;
}


@Component({
  selector: 'app-edit-graph',
  templateUrl: './edit-graph.component.html',
  styleUrls: ['./edit-graph.component.scss']
})
export class EditGraphComponent implements AfterViewInit {

  // ########################################
  // Configuration for the graph question types
  dijkstraConfig: GraphQuestionConfiguration = {
    nodeSelected: true,
    nodeSelectedText: { selected: 'Besucht', unselected: 'Nicht Besucht' },
    nodeWeight: true,
    edgeWeight: true,
    edgeDirected: false,
    stepsEnabled: true
  }
  
  kruskalConfig: GraphQuestionConfiguration = {
    nodeSelected: false,
    nodeSelectedText: { selected: '', unselected: '' },
    nodeWeight: false,
    edgeWeight: true,
    edgeDirected: false,
    stepsEnabled: true
  }
  
  floydConfig: GraphQuestionConfiguration = {
    nodeSelected: true,
    nodeSelectedText: { selected: 'Aktuell', unselected: '-' },
    nodeWeight: false,
    edgeWeight: true,
    edgeDirected: true,
    stepsEnabled: true
  }
  
  transitiveClosureConfig: GraphQuestionConfiguration = {
    nodeSelected: false,
    nodeSelectedText: { selected: '', unselected: '' },
    nodeWeight: false,
    edgeWeight: false,
    edgeDirected: true,
    stepsEnabled: false
  }

  getGraphQuestionConfigruation(graphQuestionType: string): GraphQuestionConfiguration {
    if (graphQuestionType === 'dijkstra') {
      return JSON.parse(JSON.stringify(this.dijkstraConfig));
    }
    if (graphQuestionType === 'kruskal') {
      return JSON.parse(JSON.stringify(this.kruskalConfig));
    }
    if (graphQuestionType === 'floyd') {
      return JSON.parse(JSON.stringify(this.floydConfig));
    }
    if (graphQuestionType === 'transitive_closure') {
      return JSON.parse(JSON.stringify(this.transitiveClosureConfig));
    }
    throw new Error('Invalid question type');
  }


  // ########################################
  // Form related properties 
  @ViewChild('question', { static: false }) questionField!: TinymceComponent;
  @ViewChild('expectations', { static: false }) expectationField!: TinymceComponent;

  graphForm: FormGroup;
  generateGraphForm: FormGroup;

  thisQuestionType = questionType.GRAPH;

  isSaving = false;

  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  detailedQuestionData: detailedQuestionDTO | null = null;

  questionDescriptionHTML: string = '';
  expectationsHTML: string = '';


  // ########################################
  // Workspace related properties
  workspaceIsActive = false;
  structureIsSet = false;
  
  workspaceModePrevious: string = 'assignment';
  workspaceModeCurrent: string = 'assignment';  
  public solutionStepPrevious: number = 0;
  public solutionStepCurrent: number = 0;
  
  assignmentGraphStructure: GraphStructureDTO = {
    nodes: [], edges: []
  };
  initialUsedForExampleSolution: GraphStructureDTO = {
    nodes: [], edges: []
  };

  solutionGraphStructure: GraphStructureDTO[] = [
  //   {
  //   nodes: [], edges: []
  // }
  ];

  // Store the question id from the route so that we can update the current question and not the question with id from json when importing a task
  questionId: number = -1;
  graphQuestionId: number = -1;


  // #######################################################
  // Constructor - Component lifecycle related
  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private graphTaskService: GraphTaskService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private router: Router,
    private generateFloydService: GenerateFloydService,
    private generateDijkstraService: GenerateDijkstraService,
    private generateKruskalService: GenerateKruskalService,
    private generateExampleSolutionService: GenerateExampleSolutionService,
  ) {

    this.graphForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: ['', Validators.required],
      questionScore: ['', Validators.required],
      graphQuestionType: ['', Validators.required],
    });

    this.generateGraphForm = this.fb.group(
      {
        graphNodeCount: [5],
        graphEdgeCount: [7],
        graphNodeWeightMin: [0],
        graphNodeWeightMax: [7],
        graphEdgeWeightMin: [0],
        graphEdgeWeightMax: [7],
        graphSelfEdgeCountMax: [0],
      }
    );
      
  }

  ngOnInit(): void {
    this.resetWorkspaceContent();

    // Subscribe for changes in the graph question type
    this.graphForm.get('graphQuestionType')?.valueChanges.subscribe(type => {

      // For each graph question type, apply required validators for generateGraphForm
      this.applyValidatorsByType(type);

      // Set the default parameters for question generation based on the type
      this.setDefaultsForGeneration(type);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
    }, 0);
  }

  // #######################################################
  // Fetching and submitting question data
  private handleRouteParams() {
    this.route.params.subscribe(params => {
      this.questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(this.questionId, this.thisQuestionType).subscribe(data => {
        if (data.type === questionType.GRAPH) { // TODO: Kommentar Sven: hab hier auch die entsprechende questionType anstelle des Strings eingefügt. Bitte testen.
          this.detailedQuestionData = data;
          this.graphQuestionId = this.detailedQuestionData.graphQuestion?.id || -1;
          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Graphaufgabe!', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  // TODO: complete missing fields
  private setContent() {
    this.resetWorkspaceContent();

    if (this.thisQuestionType === questionType.GRAPH && this.detailedQuestionData) {
      this.graphForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.graphQuestion) {

        this.questionField.setContent(this.detailedQuestionData.graphQuestion.textHTML || this.detailedQuestionData.text);
        this.expectationField.setContent(this.detailedQuestionData.graphQuestion.expectationsHTML || this.detailedQuestionData.graphQuestion.expectations);

        // Update form controls
        this.graphForm.patchValue({
          graphQuestionType: this.detailedQuestionData.graphQuestion.type,
        });

        const clonedInitialStructure: GraphStructureDTO = JSON.parse(JSON.stringify(this.detailedQuestionData.graphQuestion.initialStructure))
        this.assignmentGraphStructure = clonedInitialStructure;
        
        // const clonedExSolGraphSteps: GraphStructureDTO[] = JSON.parse(JSON.stringify(this.detailedQuestionData.graphQuestion.exampleSolution))
        // this.solutionGraphStructure = clonedExSolGraphSteps;
        
        this.structureIsSet = true;
      }
    }
  }

  
  protected onOverwrite() {
    this.confirmationService.confirm({
      title: 'Frage aktualisieren',
      message: 'Dies überschreibt die aktuelle Version der Frage. Fortfahren?',
      acceptLabel: 'Aktualisieren',
      declineLabel: 'Abbrechen',
      accept: () => {
        this.isSaving = true;
        const submitData = this.buildDTO();
        console.log(submitData);
        if (submitData){
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
              this.isSaving = false
            },
            error: error => {
              console.error('Error updating question:', error);
              this.snackBar.open('Fehler beim Aktualisieren der Frage', 'Schließen', { duration: 3000 });
              this.isSaving = false;
            }
          });
        } else {
          this.isSaving = false;
        }
      },
      decline: () => {
        console.log('Overwrite declined');
      }
    });
  }

  protected onSaveNewVersion() {
    return // disabled for now
  }

  protected onCancel() {
    this.confirmationService.confirm({
      title: 'Bearbeitung abbrechen',
      message: 'Dies schließt die Bearbeitung der Frage. Alle ungespeicherten Daten gehen verloren. Fortfahren?',
      acceptLabel: 'Bearbeitung abbrechen',
      declineLabel: 'Weiter bearbeiten',
      swapColors: true,
      accept: () => {
        console.log('Cancel accepted');
        this.router.navigate(['dashboard']);
      },
      decline: () => {
        console.log('Cancel declined');
      }
    });
  }

  // TODO: complete missing fields
  private buildDTO(): detailedQuestionDTO | null {
    if (this.thisQuestionType === questionType.GRAPH && this.graphForm.valid && this.detailedQuestionData){
      
      const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);

      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.graphForm.value.questionTitle,
        level: parseInt(this.graphForm.value.questionDifficulty),
        description: this.graphForm.value.questionDescription,
        score: parseInt(this.graphForm.value.questionScore),
        text: this.questionField.getRawContent(),
        graphQuestion: {
          id: this.detailedQuestionData.graphQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          expectations: this.expectationField.getRawContent(),
          expectationsHTML: this.expectationField.getContent(),
          type: this.graphForm.value.graphQuestionType,
          initialStructure: {
            nodes: this.assignmentGraphStructure.nodes,
            edges: this.assignmentGraphStructure.edges,
          },
          exampleSolution: [],//this.solutionGraphStructure,
          stepsEnabled: graphQuestionConfigruation.stepsEnabled,
          configuration: {
            nodeWeight: graphQuestionConfigruation.nodeWeight,
            nodeSelected: graphQuestionConfigruation.nodeSelected,
            nodeSelectedText: graphQuestionConfigruation.nodeSelectedText,
            edgeWeight: graphQuestionConfigruation.edgeWeight,
            edgeDirected:graphQuestionConfigruation.edgeDirected,
          },
        }
      }
      return newData;
    }
    return null;
  }

  // #######################################################
  // Workspace Content Related
  updateWorkspace() {
    // Save the previous content before resetting it (Only for initial structure)
    if (this.workspaceModePrevious === 'assignment') {
      this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepPrevious);
    }

    // #####
    // ## CASE 1: Example Solution ->  Load it to the service
    if (this.workspaceModeCurrent === 'solution') {

      // If the structure has changed
      // Generate the example solution based on the question type
      if(!this.structuresAreEqual(this.assignmentGraphStructure, this.initialUsedForExampleSolution)) {
        
        this.generateExampleSolution().subscribe( generatedExampleSolution => {
          this.solutionGraphStructure = generatedExampleSolution;

          this.snackBar.open('Die Musterlösung wurde neu generiert, da die Graphstruktur geändert wurde.', 'Schließen', { duration: 3000 });  
          
          // Get Current Step
          const graphContent: GraphStructureDTO = this.solutionGraphStructure[this.solutionStepCurrent];
          
          // Get configuration
          const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);
          
          // Clone the graph content and load it to the GraphService
          const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
          this.loadWorkspaceContent({
            graphContent: clonedGraphContent,
            graphConfiguration: graphQuestionConfigruation
          });
        });
      }
      else {
        // Get Current Step
        const graphContent: GraphStructureDTO = this.solutionGraphStructure[this.solutionStepCurrent];
          
        // Get configuration
        const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);
        
        // Clone the graph content and load it to the GraphService
        const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
        this.loadWorkspaceContent({
          graphContent: clonedGraphContent,
          graphConfiguration: graphQuestionConfigruation
        });
      }
    }


    // #####
    // ## CASE 2: Initial Structure ->  Load it to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {

        // Get configuration
        const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);

        // Clone the graph content and load it to the GraphService
        const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(this.assignmentGraphStructure));
        this.loadWorkspaceContent({
          graphContent: clonedGraphContent,
          graphConfiguration: graphQuestionConfigruation
        });
    }

    // Update the previous mode and previous step for the future changes
    this.workspaceModePrevious = this.workspaceModeCurrent;
    this.solutionStepPrevious = this.solutionStepCurrent;
  }

  loadWorkspaceContent(params: Partial<{
    graphContent: GraphStructureDTO;
    graphConfiguration: GraphConfigurationDTO | null
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

  saveWorkspaceContent(mode: string, step: number) {
    
    // Do not save changes for example solution mode as it is being generated and not edited
    if (mode === 'solution') {
      return;
    }

    // graphToJSON returns also the configuration and structureType
    // Use only nodes and edges
    const graph = this.graphTaskService.graphToJSON();
    const graphDataJSON: GraphStructureDTO = { nodes: graph.nodes, edges: graph.edges };

    // Clone GraphService content
    const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphDataJSON));

    // Update the initial graph structure. It can only be initial structure
    this.assignmentGraphStructure = clonedGraphContent;
  }

  activateWorkspace() {
    // Save text content before activating workspace
    this.questionDescriptionHTML = this.questionField.getContent();
    this.expectationsHTML = this.expectationField.getContent();

    // Display workspace
    this.workspaceIsActive = true;

    // Indicates that the structure content is not empty
    // To reset structure content in case assignment configuration changes 
    this.structureIsSet = true;

    // Get configuration
    const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);
    
    // Get Graph Configuration from form data
    this.graphTaskService.configureGraph(graphQuestionConfigruation);

    // Clone the graph structure according to the mode. It can be initial structure or example solution
    let clonedGraphContent!: GraphStructureDTO;
    if (this.workspaceModeCurrent === 'assignment') {
      clonedGraphContent = JSON.parse(JSON.stringify(this.assignmentGraphStructure)); 
    } else if (this.workspaceModeCurrent === 'solution') {
      clonedGraphContent = JSON.parse(JSON.stringify(this.solutionGraphStructure[this.solutionStepCurrent])); 
    }

    // Load workspace to the service
    this.loadWorkspaceContent({
      graphContent: clonedGraphContent,
      graphConfiguration: graphQuestionConfigruation
    });
    
  }

  deactivateWorkspace() {
    // Hide workspace
    this.workspaceIsActive = false;
    
    // Save recent updated workspace content (only for initial structure)
    if (this.workspaceModePrevious === 'assignment') {
      this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepCurrent);
    }

    // Reset the content in service for future use
    this.graphTaskService.resetGraph();

    // Load the text content back to the editor after the workspace is reactivated
    setTimeout(() => {
      // This will run after the view (DOM) is updated
      this.questionField.setContent(this.questionDescriptionHTML);
      this.expectationField.setContent(this.expectationsHTML);
    }, 0); // 0ms delay to ensure it's executed after the DOM update
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
    return; // disabled for now as the solution is being generated automatically and not edited manually 

    // Before adding new step, the current step need to be saved
    this.saveWorkspaceContent(this.workspaceModePrevious, this.solutionStepPrevious);

    // Add new solution

    // Use the data of the last step for the new step if exists ; else use assignment data
    let last: GraphStructureDTO;

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

  deleteCurrentSolutionStep() {
    return; // disabled for now as the solution is being generated automatically and not edited manually 

    if (this.solutionGraphStructure.length > 1) {

      // Remove the current step
      this.solutionGraphStructure.splice(this.solutionStepCurrent, 1);

      // Set the current/previuos step
      if (this.solutionStepCurrent >= this.solutionGraphStructure.length) {
        this.solutionStepCurrent = this.solutionGraphStructure.length - 1;
      }
      if (this.solutionStepCurrent < 0) {
        this.solutionStepCurrent = 0;
      }

      this.solutionStepPrevious = this.solutionStepCurrent;

      // Did not use updateWorkspace function because it would override the removed content from prev step to the new current step
      // Get Current Step
      const graphContent: GraphStructureDTO = this.solutionGraphStructure[this.solutionStepCurrent];

      // Get configuration
      const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);

      // To use only values and not the references
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({ graphContent: clonedGraphContent, graphConfiguration: graphQuestionConfigruation });
    } else {
        console.warn('Not enough steps to delete. Current steps:', this.solutionGraphStructure.length);
    }
  }

  resetStructure() {

    this.confirmationService.confirm({
      title: 'Struktur zurücksetzen',
      message: 'Sind Sie sicher, dass Sie die Struktur zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?',
      acceptLabel: 'Zurücksetzen',
      declineLabel: 'Abbrechen',
      accept: () => {   
        // Reset the initial structure
        this.assignmentGraphStructure = {
          nodes: [], edges: []
        }

        // Reset the solution steps
        this.solutionGraphStructure = [];
        this.solutionStepCurrent = 0;
        this.solutionStepPrevious = this.solutionStepCurrent;

        this.initialUsedForExampleSolution = {
          nodes: [], edges: []
        }

        this.workspaceModeCurrent = 'assignment';
        this.workspaceModePrevious = this.workspaceModeCurrent;

        // Get configuration
        const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);

        this.loadWorkspaceContent({
          graphContent: this.assignmentGraphStructure,
          graphConfiguration: graphQuestionConfigruation
        });


        // To use only values and not the references
        this.updateWorkspace();
      }
    });

  }

  onChangeGraphQuestionType(gqType: string): void {

    if (this.structureIsSet) {
      this.snackBar.open('Die Graphstruktur wurde zurückgesetzt.', 'Schließen', { duration: 3000 });
      this.resetWorkspaceContent();
    }

  }

  // #######################################################
  // Exporting and Importing Task
  exportTask() {
    const exportQuestion: detailedQuestionDTO | null = this.buildDTO();
    if (!exportQuestion) {
      this.snackBar.open('Fehler beim Exportieren der Aufgabe', 'Schließen', { duration: 3000 });
      return;
    }
    const jsonString = JSON.stringify(exportQuestion, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_task_${exportQuestion.name}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importTask(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          this.detailedQuestionData = importedData as detailedQuestionDTO;

          // Use question id from current route so that we update current question and not the question with id from json
          this.detailedQuestionData.id = this.questionId;
          this.detailedQuestionData.graphQuestion!.id = this.graphQuestionId;

          this.setContentFromJSON(importedData);

          this.snackBar.open('Task imported successfully', 'Close', { duration: 3000 });
        } catch (error) {
          console.error('Error parsing imported JSON:', error);
          this.snackBar.open('Error importing task', 'Close', { duration: 3000 });
        }
      };
      reader.readAsText(file);
    }
  }

  setContentFromJSON(questionData: detailedQuestionDTO): void {
    this.resetWorkspaceContent();

    this.graphForm.patchValue({
      questionTitle: questionData.name || '',
      questionDifficulty: questionData.level.toString() || '1',
      questionDescription: questionData.description || '',
      questionScore: questionData.score || 100,
    });
    if (questionData.graphQuestion) {

      this.questionField.setContent(questionData.graphQuestion.textHTML || questionData.text || '');
      this.expectationField.setContent(questionData.graphQuestion.expectationsHTML || questionData.graphQuestion.expectations || '');

      if (questionData.graphQuestion.type === 'dijkstra' || 
          questionData.graphQuestion.type === 'floyd' || 
          questionData.graphQuestion.type === 'kruskal' || 
          questionData.graphQuestion.type === 'transitive_closure') {

        this.graphForm.patchValue({
          graphQuestionType: questionData.graphQuestion.type,
        });
      
        const clonedInitialStructure: GraphStructureDTO = JSON.parse(JSON.stringify(questionData.graphQuestion.initialStructure || { nodes: [], edges: [] }))
        this.assignmentGraphStructure = clonedInitialStructure;
        
        const clonedExSolGraphSteps: GraphStructureDTO[] = JSON.parse(JSON.stringify(questionData.graphQuestion.exampleSolution || []))
        this.solutionGraphStructure = clonedExSolGraphSteps;

        this.structureIsSet = true;
      }
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

    
  // #######################################################
  // Generate Graph Task

  generateTextFromStructure() {
    let textHTML = null;

    if (this.assignmentGraphStructure.nodes.length === 0) {
      this.snackBar.open('Die Graphstruktur muss zunächst erstellt werden.', 'Schließen', { duration: 3000 });
      return;
    }

    if (this.graphForm.value.graphQuestionType === 'dijkstra') {

      // Find the start node
      const startNode: GraphNodeDTO | undefined = this.assignmentGraphStructure.nodes.find(node => node.weight === 0 );
      
      if (!startNode) {
        this.snackBar.open('Die Graphstruktur muss ein Startknoten mit Gewicht 0 enthalten.', 'Schließen', { duration: 3000 });
        return;
      }

      // Get the node values
      const nodeValues: string[] = this.assignmentGraphStructure.nodes.map(node => node.value);

      // Adjust the text
      textHTML = `
      Gegeben sei der folgende ungerichtete Graph G mit den Knoten V = {${nodeValues.join(', ')}}.<br>
      Berechnen Sie den kürzesten Weg für alle Knoten ausgehend vom Startknoten ${startNode.value}.<br>
      Verwenden Sie den Dijkstra-Algorithmus und zeichnen Sie dabei jeden Schritt in ein eigenes Diagramm.<br> 
      Markieren Sie dabei den aktuell besuchten Knoten.
      `;

    }
    
    if (this.graphForm.value.graphQuestionType === 'floyd') {
      
      // Get the node values
      const nodeValues: string[] = this.assignmentGraphStructure.nodes.map(node => node.value);

      // Adjust the text
      textHTML = `
      Berechnen Sie den kürzesten Weg nach Verarbeitung der Knoten ${nodeValues.join(', ')} in <strong>beliebiger</strong> Reihenfolge unter Verwendung des Algorithmus von Floyd.<br>
      Fügen Sie zugehörige Kantengewichte und falls erforderlich zusätzliche Kanten ein.<br>
      Übernehmen Sie bereits hinzugefügte Kanten und aktualisierte Kantengewichte in späteren Schritten.
      `;
    }
    
    if (this.graphForm.value.graphQuestionType === 'kruskal') {

      // Get the node values
      const nodeValues: string[] = this.assignmentGraphStructure.nodes.map(node => node.value);

      // Adjust the text
      textHTML = `
      Gegeben sei der folgende ungerichtete Graph G mit den Knoten V = {${nodeValues.join(', ')}}.<br>
      Nutzen Sie den Algorithmus von Kruskal, um den Minimalen Spannbaum B zu erzeugen.<br>
      Erstellen Sie jeden Schritt in ein eigenes Diagramm.
      `;
      
    }
    
    if (this.graphForm.value.graphQuestionType === 'transitive_closure') {

      // Get the node values
      const nodeValues: string[] = this.assignmentGraphStructure.nodes.map(node => node.value);

      // Adjust the text
      textHTML = `
      Gegeben sei der folgende gerichtete Graph G mit V = {${nodeValues.join(', ')}}.<br>
      Fügen Sie alle Kanten zu G hinzu, die zu dessen Transitive Hülle gehören.<br>
      Der Graph <strong>muss</strong> auch bereits vorhandene Kanten enthalten.
      `;
      
    }

    if (textHTML) {
      this.questionDescriptionHTML = textHTML;
      this.questionField.setContent(textHTML);
    }    
  }

  setDefaultsForGeneration(type: string) {

    if (type === 'dijkstra') {
      this.generateGraphForm.patchValue({
        graphNodeCount: 5,
        graphEdgeCount: 6,
        graphNodeWeightMin: 0,
        graphNodeWeightMax: 7,
        graphEdgeWeightMin: 0,
        graphEdgeWeightMax: 7,
        graphSelfEdgeCountMax: 0,
      })
    }
    if (type === 'kruskal') {
      this.generateGraphForm.patchValue({
        graphNodeCount: 5,
        graphEdgeCount: 7,
        graphNodeWeightMin: 0,
        graphNodeWeightMax: 7,
        graphEdgeWeightMin: 0,
        graphEdgeWeightMax: 7,
        graphSelfEdgeCountMax: 0,
      })
    }
    if (type === 'transitive_closure') {
      this.generateGraphForm.patchValue({
        graphNodeCount: 5,
        graphEdgeCount: 5,
        graphSelfEdgeCountMax: 0,
      })
    }
    if (type === 'floyd') {
      this.generateGraphForm.patchValue({
        graphNodeCount: 5,
        graphEdgeCount: 5,
        graphEdgeWeightMin: 0,
        graphEdgeWeightMax: 10,
        graphSelfEdgeCountMax: 0,
      })
    }

  }

  applyValidatorsByType(type: string) {
    // Clear any previous validators
    this.generateGraphForm.get('graphNodeCount')?.clearValidators();
    this.generateGraphForm.get('graphEdgeCount')?.clearValidators();
    this.generateGraphForm.get('graphNodeWeightMin')?.clearValidators();
    this.generateGraphForm.get('graphNodeWeightMax')?.clearValidators();
    this.generateGraphForm.get('graphEdgeWeightMin')?.clearValidators();
    this.generateGraphForm.get('graphEdgeWeightMax')?.clearValidators();

    // Set default validators for all question types
    this.generateGraphForm.get('graphNodeCount')?.setValidators([
      Validators.required,
      Validators.min(1)  // Default min count
    ]);
    this.generateGraphForm.get('graphEdgeCount')?.setValidators([
      Validators.required,
      Validators.min(0)  // Default min edges count
    ]);
    this.generateGraphForm.get('graphSelfEdgeCount')?.setValidators([
      Validators.required,
      Validators.min(0)  // Default min self edges count
    ]);
    
    // Set validators based on type
    if (type === 'kruskal') {
      // TODO: is not working properly
      // this.generateGraphForm.get('graphEdgeCount')?.setValidators([
      //   Validators.required,
      //   this.edgesCountMinNodesValidator('graphNodeCount')
      // ]);
    } else if (type === 'dijkstra') {
      this.generateGraphForm.get('graphEdgeWeightMin')?.setValidators([
        Validators.required,
        Validators.min(0)  // Only positive weights
      ]);
      this.generateGraphForm.get('graphEdgeWeightMax')?.setValidators([
        Validators.required,
        Validators.min(0)  // Only positive weights
      ]);
    } else if (type === 'floyd') {
      // Allow negative weights for Floyd, no specific validator required
      this.generateGraphForm.get('graphEdgeWeightMin')?.setValidators([
        Validators.required
      ]);
      this.generateGraphForm.get('graphEdgeWeightMax')?.setValidators([
        Validators.required
      ]);
    }

    // Add form-level validator for min <= max
      this.generateGraphForm.setValidators([
        this.minLessThanOrEqualMaxValidator('graphNodeWeightMin', 'graphNodeWeightMax'),
        this.minLessThanOrEqualMaxValidator('graphEdgeWeightMin', 'graphEdgeWeightMax')
    ]);

    this.generateGraphForm.updateValueAndValidity();
  }

  // Validator for ensuring edges count is at least nodes count - 1 for Kruskal
  edgesCountMinNodesValidator(nodeCountControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const nodesCount = this.generateGraphForm.get(nodeCountControlName)?.value || 0;
      const edgesCount = control.value || 0;
      return edgesCount >= nodesCount - 1 ? null : { edgesTooFew: true };
    };
  }

  minLessThanOrEqualMaxValidator(minControlName: string, maxControlName: string): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
        const minControl = form.get(minControlName);
        const maxControl = form.get(maxControlName);

        if (!minControl || !maxControl) {
            return null;  // If either control is missing, no error
        }

        const min = minControl.value;
        const max = maxControl.value;

        // Check if min > max
        return (min !== null && max !== null && min > max)
            ? { minGreaterThanMax: true }
            : null;
    };
  }

  // TODO: is being used as form validation is not working properly for kruskal specific edge count
  generateButtonDisabled() {
    if (this.graphForm.value.graphQuestionType === 'kruskal') {
      return (
        this.generateGraphForm.invalid ||
        this.generateGraphForm.value.graphEdgeCount < this.generateGraphForm.value.graphNodeCount - 1 ||
        // Ensure the number of edges are not more than the maximum possible for a indirected graph with n nodes
        this.generateGraphForm.value.graphEdgeCount > this.generateGraphForm.value.graphNodeCount * (this.generateGraphForm.value.graphNodeCount - 1) / 2 + this.generateGraphForm.value.graphSelfEdgeCountMax
      );
    }

    if (this.graphForm.value.graphQuestionType === 'dijkstra') {
      return ( 
        this.generateGraphForm.invalid ||
        // Ensure the number of edges are not more than the maximum possible for a indirected graph with n nodes
        this.generateGraphForm.value.graphEdgeCount > this.generateGraphForm.value.graphNodeCount * (this.generateGraphForm.value.graphNodeCount - 1) / 2 + this.generateGraphForm.value.graphSelfEdgeCountMax
      );
    }

    if (this.graphForm.value.graphQuestionType === 'floyd' || this.graphForm.value.graphQuestionType === 'transitive_closure') {
      return ( 
        this.generateGraphForm.invalid ||
        // Ensure the number of edges are not more than the maximum possible for a directed graph with n nodes
        this.generateGraphForm.value.graphEdgeCount > this.generateGraphForm.value.graphNodeCount * (this.generateGraphForm.value.graphNodeCount - 1) + this.generateGraphForm.value.graphSelfEdgeCountMax
      );
    }

    return this.generateGraphForm.invalid;
  }

  generateGraphFormVisibility(FIELD: string)  {
    
    if ( FIELD === 'NODES_EDGES_COUNT' ) { 
      return (
        this.graphForm.value.graphQuestionType === 'dijkstra' ||
        this.graphForm.value.graphQuestionType === 'floyd' ||
        this.graphForm.value.graphQuestionType === 'kruskal' ||
        this.graphForm.value.graphQuestionType === 'transitive_closure'
      );
    }

    if ( FIELD === 'NODE_WEIGHT' ) {
      return false;
    }

    if ( FIELD === 'EDGE_WEIGHT' ) {
      return (
        this.graphForm.value.graphQuestionType === 'dijkstra' ||
        this.graphForm.value.graphQuestionType === 'floyd' ||
        this.graphForm.value.graphQuestionType === 'kruskal'
      );
    }

    if ( FIELD === 'SELF_EDGES_COUNT' ) {
      return (
        this.graphForm.value.graphQuestionType === 'floyd' ||
        this.graphForm.value.graphQuestionType === 'transitive_closure'
      );
    }

    return false;
  }

  onGenerateClick() {
    
    // If the structure is empty, generate it
    if (this.assignmentGraphStructure.nodes.length === 0 && this.graphTaskService.graphToJSON().nodes.length === 0) {
      this.onGenerate();
      return;
    }
    
    // If the structure is not empty, confirm the user to overwrite it

    this.confirmationService.confirm({
      title: 'Struktur neu generieren',
      message: 'Möchten Sie die Struktur wirklich neu generieren? Dabei geht die aktuelle Struktur unwiderruflich verloren. Fortfahren?',
      acceptLabel: 'Neu generieren',
      declineLabel: 'Abbrechen',
      accept: () => { this.onGenerate() } 
    });
  }

  onGenerate() {
    const graphStructure = this.generateGraph();

    if (graphStructure === undefined) {
      this.snackBar.open('Fehler beim Generieren der Graphstruktur.', 'Schließen', { duration: 3000 });
      return;
    }

    this.resetWorkspaceContent();

    const clonedInitialStructure: GraphStructureDTO = JSON.parse(JSON.stringify(graphStructure));
    this.assignmentGraphStructure = clonedInitialStructure;

    this.snackBar.open('Neue Graphstruktur wurde generiert.', 'Schließen', { duration: 3000 });
    
    this.structureIsSet = true;

    this.generateTextFromStructure();
  }

  onQuickGenerateClick() {
    
    // If the structure is empty, generate it
    if (this.assignmentGraphStructure.nodes.length === 0 && this.graphTaskService.graphToJSON().nodes.length === 0) {
      this.onQuickGenerate();
      return;
    }
    
    // If the structure is not empty, confirm the user to overwrite it
    this.confirmationService.confirm({
      title: 'Struktur neu generieren',
      message: 'Möchten Sie die Struktur wirklich neu generieren? Dabei geht die aktuelle Struktur unwiderruflich verloren. Fortfahren?',
      acceptLabel: 'Neu generieren',
      declineLabel: 'Abbrechen',
      accept: () => { this.onQuickGenerate() } 
    });
  }

  onQuickGenerate() {
    const graphStructure = this.generateGraph();

    if (graphStructure === undefined) {
      this.snackBar.open('Fehler beim Generieren der Graphstruktur.', 'Schließen', { duration: 3000 });
      return;
    }

    this.resetWorkspaceContent();

    const clonedInitialStructure: GraphStructureDTO = JSON.parse(JSON.stringify(graphStructure));
    this.assignmentGraphStructure = clonedInitialStructure;

    // Get configuration
    const graphQuestionConfigruation = this.getGraphQuestionConfigruation(this.graphForm.value.graphQuestionType);

    // Clone the graph content and load it to the GraphService
    const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(this.assignmentGraphStructure));
    this.loadWorkspaceContent({
      graphContent: clonedGraphContent,
      graphConfiguration: graphQuestionConfigruation
    });

    this.snackBar.open('Neue Graphstruktur wurde generiert.', 'Schließen', { duration: 3000 });

    this.structureIsSet = true;

    this.generateTextFromStructure();
  }

  generateGraph(): GraphStructureDTO | undefined {

    
    if (this.graphForm.value.graphQuestionType === 'floyd') {

      const { nodes, edges } = this.generateFloydService.generate({
        nodesCount: this.generateGraphForm.value.graphNodeCount,
        edgesCount: this.generateGraphForm.value.graphEdgeCount,
        maxSelfEdges: this.generateGraphForm.value.graphSelfEdgeCountMax,
        edgeWeight: {
          enabled: true,
          min: this.generateGraphForm.value.graphEdgeWeightMin,
          max: this.generateGraphForm.value.graphEdgeWeightMax,
        }
      });

      return {nodes, edges};
    }

    if (this.graphForm.value.graphQuestionType === 'transitive_closure') {

      const { nodes, edges } = this.generateFloydService.generate({
        nodesCount: this.generateGraphForm.value.graphNodeCount,
        edgesCount: this.generateGraphForm.value.graphEdgeCount,
        maxSelfEdges: this.generateGraphForm.value.graphSelfEdgeCountMax,
        edgeWeight: {
          enabled: false,
          min: 0,
          max: 0,
        }
      });

      return {nodes, edges};
    }

    if (this.graphForm.value.graphQuestionType === 'dijkstra') {

      const { nodes, edges } = this.generateDijkstraService.generate({
        nodesCount: this.generateGraphForm.value.graphNodeCount,
        edgesCount: this.generateGraphForm.value.graphEdgeCount,
        edgeWeight: {
          enabled: true,
          min: this.generateGraphForm.value.graphEdgeWeightMin,
          max: this.generateGraphForm.value.graphEdgeWeightMax,
        }
      });

      return {nodes, edges};
    }

    if (this.graphForm.value.graphQuestionType === 'kruskal') {
      
      const { nodes, edges } = this.generateKruskalService.generate({
        nodesCount: this.generateGraphForm.value.graphNodeCount,
        edgesCount: this.generateGraphForm.value.graphEdgeCount,
        edgeWeight: {
          enabled: true,
          min: this.generateGraphForm.value.graphEdgeWeightMin,
          max: this.generateGraphForm.value.graphEdgeWeightMax,
        }
      });

      return {nodes, edges};
    }

    return undefined;

  }

  generateExampleSolution(): Observable<GraphStructureDTO[]> {
    // Update the initialUsedForExampleSolution so that we can know if the example solution is need to be generated again
    this.initialUsedForExampleSolution = JSON.parse(JSON.stringify(this.assignmentGraphStructure));

    // Generate the example solution based on the question type
    if (this.graphForm.value.graphQuestionType === 'transitive_closure') {
      return this.generateExampleSolutionService.generateTransitiveClosureExampleSolution(this.assignmentGraphStructure);
    }
    if (this.graphForm.value.graphQuestionType === 'dijkstra') {
      return this.generateExampleSolutionService.generateDijkstraExampleSolution(this.assignmentGraphStructure);
    }
    if (this.graphForm.value.graphQuestionType === 'floyd') {
      return this.generateExampleSolutionService.generateFloydExampleSolution(this.assignmentGraphStructure);
    }
    if (this.graphForm.value.graphQuestionType === 'kruskal') {
      return this.generateExampleSolutionService.generateKruskalExampleSolution(this.assignmentGraphStructure);
    }

    throw new Error('No example solution generator found for the given question type');
  }

  structuresAreEqual(structure1: GraphStructureDTO, structure2: GraphStructureDTO): boolean {

    if (structure1.nodes.length !== structure2.nodes.length) {
      return false;
    }

    if (structure1.edges.length !== structure2.edges.length) {
      return false;
    }

    for (let i = 0; i < structure1.nodes.length; i++) {

      const sameNode = structure2.nodes.find(node => 
        node.nodeId === structure1.nodes[i].nodeId && node.value === structure1.nodes[i].value
      )

      if (!sameNode) {
        return false;
      }

      if (structure1.nodes[i].value !== sameNode.value) {
        return false;
      }
      if (structure1.nodes[i].weight !== sameNode.weight) {
        return false;
      }
      if (structure1.nodes[i].selected !== sameNode.selected) {
        return false;
      }
      if (structure1.nodes[i].position.x !== sameNode.position.x) {
        return false;
      }
      if (structure1.nodes[i].position.y !== sameNode.position.y) {
        return false;
      }
      if (structure1.nodes[i].nodeId !== sameNode.nodeId) {
        return false;
      }
      if (structure1.nodes[i].size.width !== sameNode.size.width) {
        return false;
      }
      if (structure1.nodes[i].size.height !== sameNode.size.height) {
        return false;
      }
      if (structure1.nodes[i].center.x !== sameNode.center.x) {
        return false;
      }
      if (structure1.nodes[i].center.y !== sameNode.center.y) {
        return false;
      }
    }

    const structure1Semantic: GraphStructureSemanticDTO = graphJSONToSemantic(structure1);
    const structure2Semantic: GraphStructureSemanticDTO = graphJSONToSemantic(structure1);

    for (let i = 0; i < structure1Semantic.edges.length; i++) {
      const sameEdge = structure2Semantic.edges.find(edge => 
        edge.node1Value === structure1Semantic.edges[i].node1Value && edge.node2Value === structure1Semantic.edges[i].node2Value
      )

      if (!sameEdge) {
        return false;
      }

      if (sameEdge.weight !== structure1.edges[i].weight) {
        return false;
      }
    }

    return true;
  }

}