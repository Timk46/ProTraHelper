import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GraphConfigurationDTO, GraphNodeDTO, GraphStructureDTO } from '@DTOs/graphTask.dto';
import { GraphTaskService } from 'src/app/Modules/graph-tasks/services/graph-task.service';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { questionType } from '@DTOs/question.dto';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TinymceComponent } from '../../tinymce/tinymce.component';

@Component({
  selector: 'app-edit-graph',
  templateUrl: './edit-graph.component.html',
  styleUrls: ['./edit-graph.component.scss']
})
export class EditGraphComponent implements AfterViewInit {

  // ########################################
  // Form related properties 
  @ViewChild('question', { static: false }) questionField!: TinymceComponent;
  @ViewChild('expectations', { static: false }) expectationField!: TinymceComponent;

  graphForm: FormGroup;

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
    private router: Router
  ) {

    this.graphForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: ['', Validators.required],
      questionScore: ['', Validators.required],
      graphQuestionType: ['', Validators.required],
      stepsEnabled: [false],
      checkboxEdgeDirected: [false],
      checkboxEdgeWeighted: [false],
      checkboxNodeWeighted: [false],
      checkboxNodeSelected: [false],
      checkboxNodeSelectedText: [{ selected: '', unselected: '' }]
    });
  }

  ngOnInit(): void {
    this.resetWorkspaceContent();
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
          stepsEnabled: this.detailedQuestionData.graphQuestion.stepsEnabled,
          checkboxEdgeDirected: this.detailedQuestionData.graphQuestion.configuration.edgeDirected || false,
          checkboxEdgeWeighted: this.detailedQuestionData.graphQuestion.configuration.edgeWeight || false,
          checkboxNodeWeighted: this.detailedQuestionData.graphQuestion.configuration.nodeWeight || false,
          checkboxNodeSelected: this.detailedQuestionData.graphQuestion.configuration.nodeSelected || false,
          checkboxNodeSelectedText: this.detailedQuestionData.graphQuestion.configuration.nodeSelectedText || { selected: '', unselected: '' }
        });

        const clonedInitialStructure: GraphStructureDTO = JSON.parse(JSON.stringify(this.detailedQuestionData.graphQuestion.initialStructure))
        this.assignmentGraphStructure = clonedInitialStructure;
        
        const clonedExSolGraphSteps: GraphStructureDTO[] = JSON.parse(JSON.stringify(this.detailedQuestionData.graphQuestion.exampleSolution))
        this.solutionGraphStructure = clonedExSolGraphSteps;
        
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
          exampleSolution: this.solutionGraphStructure,
          stepsEnabled: this.graphForm.value.stepsEnabled,
          configuration: {
            nodeWeight: this.graphForm.value.checkboxNodeWeighted,
            nodeSelected: this.graphForm.value.checkboxNodeSelected,
            nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
            edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
            edgeDirected: this.graphForm.value.checkboxEdgeDirected,
          },
        }
      }
      return newData;
    }
    return null;
  }

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
      this.questionField.setContent(textHTML);
    }    
  }


  // #######################################################
  // Workspace Content Related
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
      const graphContent: GraphStructureDTO = this.solutionGraphStructure[this.solutionStepCurrent];
      
      // Clone the graph content and load it to the GraphService
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({
        graphContent: clonedGraphContent,
        graphConfiguration: {
          nodeSelected: this.graphForm.value.checkboxNodeSelected,
          nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
          nodeWeight: this.graphForm.value.checkboxNodeWeighted,
          edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
          edgeDirected: this.graphForm.value.checkboxEdgeDirected,
          }
      });

    }


    // #####
    // ## CASE 2: Initial Structure ->  Load it to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {
      
        // Clone the graph content and load it to the GraphService
        const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(this.assignmentGraphStructure));
        this.loadWorkspaceContent({
          graphContent: clonedGraphContent,
          graphConfiguration: {
            nodeSelected: this.graphForm.value.checkboxNodeSelected,
            nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
            nodeWeight: this.graphForm.value.checkboxNodeWeighted,
            edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
            edgeDirected: this.graphForm.value.checkboxEdgeDirected,
          }
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
    
      
    // graphToJSON returns also the configuration and structureType
    // Use only nodes and edges
    const graph = this.graphTaskService.graphToJSON();
    const graphDataJSON: GraphStructureDTO = { nodes: graph.nodes, edges: graph.edges };

    // Clone GraphService content
    const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphDataJSON));

    // Update the graph structure according to the mode. It can be initial structure or example solution
    if (mode === 'solution') {
      this.solutionGraphStructure[step] = clonedGraphContent;
    } else if (mode === 'assignment') {
      this.assignmentGraphStructure = clonedGraphContent;
    }
  }

  activateWorkspace() {
    // Save text content before activating workspace
    console.log(this.questionField.getContent());
    this.questionDescriptionHTML = this.questionField.getContent();
    this.expectationsHTML = this.expectationField.getContent();
    console.log(this.questionDescriptionHTML);

    // Display workspace
    this.workspaceIsActive = true;

    // Indicates that the structure content is not empty
    // To reset structure content in case assignment configuration changes 
    this.structureIsSet = true;


    
    // Get Graph Configuration from form data
    this.graphTaskService.configureGraph({
      nodeSelected: this.graphForm.value.checkboxNodeSelected,
      nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
      nodeWeight: this.graphForm.value.checkboxNodeWeighted,
      edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
      edgeDirected: this.graphForm.value.checkboxEdgeDirected, 
    })

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
      graphConfiguration: {
        nodeSelected: this.graphForm.value.checkboxNodeSelected,
        nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
        nodeWeight: this.graphForm.value.checkboxNodeWeighted,
        edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
        edgeDirected: this.graphForm.value.checkboxEdgeDirected,
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

      // To use only values and not the references
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({ graphContent: clonedGraphContent, graphConfiguration: this.detailedQuestionData?.graphQuestion?.configuration });
    } else {
        console.warn('Not enough steps to delete. Current steps:', this.solutionGraphStructure.length);
    }
  }

  resetSolution() {
    // Reset the solution steps
    this.solutionGraphStructure = [];
    this.solutionStepCurrent = 0;
    this.solutionStepPrevious = this.solutionStepCurrent;

    this.workspaceModeCurrent = 'assignment';
    this.workspaceModePrevious = this.workspaceModeCurrent;

    // To use only values and not the references
    this.updateWorkspace();
  }

  resetStructure() {
    // Reset the solution steps
    this.assignmentGraphStructure = {
      nodes: [], edges: []
    };

    this.workspaceModeCurrent = 'assignment';
    this.workspaceModePrevious = this.workspaceModeCurrent;

    this.loadWorkspaceContent({
      graphContent: this.assignmentGraphStructure,
      graphConfiguration: {
        nodeSelected: this.graphForm.value.checkboxNodeSelected,
        nodeSelectedText: this.graphForm.value.checkboxNodeSelectedText,
        nodeWeight: this.graphForm.value.checkboxNodeWeighted,
        edgeWeight: this.graphForm.value.checkboxEdgeWeighted,
        edgeDirected: this.graphForm.value.checkboxEdgeDirected,
        }
    });

    // To use only values and not the references
    this.updateWorkspace();
  }

  onChangeGraphQuestionType(gqType: string): void {

    if (this.structureIsSet) {
      this.snackBar.open('Die Graphstruktur wurde zurückgesetzt.', 'Schließen', { duration: 3000 });
      this.resetWorkspaceContent();
    }

    // Update form controls according to the assignment type
    if (this.graphForm.value.graphQuestionType === 'dijkstra') {
      this.graphForm.patchValue({
        stepsEnabled: true,
        checkboxEdgeDirected: false,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: true,
        checkboxNodeSelected: true,
        checkboxNodeSelectedText: { selected: 'Besucht', unselected: 'Nicht Besucht' }
      });  
      
    }
    else if (this.graphForm.value.graphQuestionType === 'floyd') {
      this.graphForm.patchValue({
        stepsEnabled: true,
        checkboxEdgeDirected: true,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: false,
        checkboxNodeSelected: true,
        checkboxNodeSelectedText: { selected: 'Aktuell', unselected: '-' }
      });  
      
    }
    else if (this.graphForm.value.graphQuestionType === 'kruskal') {
      this.graphForm.patchValue({
        stepsEnabled: true,
        checkboxEdgeDirected: false,
        checkboxEdgeWeighted: true,
        checkboxNodeWeighted: false,
        checkboxNodeSelected: false,
        checkboxNodeSelectedText: { selected: '', unselected: '' }
      }); 

    }
    else if (this.graphForm.value.graphQuestionType === 'transitive_closure') {
      this.graphForm.patchValue({
        stepsEnabled: false,
        checkboxEdgeDirected: true,
        checkboxEdgeWeighted: false,
        checkboxNodeWeighted: false,
        checkboxNodeSelected: false,
        checkboxNodeSelectedText: { selected: '', unselected: '' }
      }); 
      
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
        this.onChangeGraphQuestionType(questionData.graphQuestion.type);
      
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

}