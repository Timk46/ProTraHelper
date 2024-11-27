import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphStructureDTO, GraphConfigurationDTO } from '@DTOs/graphTask.dto';
import { GraphTaskService } from '../services/graph-task.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { GraphQuestionDTO, QuestionDTO, questionType } from '@DTOs/question.dto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';


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

  initialStructure: GraphStructureDTO = {
    nodes: [], edges: []
  };

  public solutionGraph: GraphStructureDTO[] = [];

  public algoFeedback: string = '';
  public llmFeedback: string = '';
  public feedbackTypeCurrent:  'algoFeedback' | 'llmFeedback' | '' = '';
  public feedbackDisabled: boolean = true;

  thisQuestionType = questionType.GRAPH;
  
  questionData: QuestionDTO | null = null;
  graphQuestionData: GraphQuestionDTO | null = null;

  isSending: boolean = false;

  constructor(
    private graphTaskService: GraphTaskService,
    private route: ActivatedRoute,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar,
    private progressService: ProgressService,
    private router: Router,
    private confirmationService: ConfirmationService,
  ) {

  }

  ngOnInit(): void {

    // get assignment id from url
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);

      // reset the state of the graph service
      this.graphTaskService.resetGraph();

      // get question details
      this.questionDataService.getGraphQuestion(questionId).subscribe(graphQuestionData => {

        this.questionDataService.getQuestionData(questionId).subscribe(questionData => {
          
          if (questionData.type === questionType.GRAPH) { // TODO: entsprechende questionType anstelle des Strings, testen.
            this.graphQuestionData = graphQuestionData;
            this.initialStructure = JSON.parse(JSON.stringify(this.graphQuestionData.initialStructure));
            this.questionData = questionData;
            this.updateWorkspace();
          }
          else {
            this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Graphaufgabe!', 'Schließen', { duration: 10000 });
            this.thisQuestionType = questionData.type as questionType;
          }
        });
      });

      this.questionDataService.getNewestUserAnswer(questionId).subscribe(data => {
        if (data.userGraphAnswer) {
          this.solutionGraph = data.userGraphAnswer;
          this.workspaceModeCurrent = 'solution';
          this.updateWorkspace();
        }
      });
    });
  }

  onSubmitButtonClick() {
    
    if (!this.graphQuestionData) { return; }

    // To save workpace content if it is in solution mode
    this.updateWorkspace();
    this.isSending = true;
    this.algoFeedback = '';
    this.llmFeedback = '';
    
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.graphQuestionData.questionId,
      contentElementId: this.graphQuestionData.contentElementId,
      userId: -1,
      userGraphAnswer: this.solutionGraph
    }

    console.log(JSON.stringify(userAnswerData, null, 2));
    this.questionDataService.createUserAnswer(userAnswerData).subscribe(result => {
      console.log(result);
      this.handleCodeSubmissionResponse(result);
    });

  }

  handleCodeSubmissionResponse(result: userAnswerFeedbackDTO): void {
    this.isSending = false;

    // for first submission, enable the feedback and set the feedback type to algoFeedback 
    if (this.feedbackDisabled) {
      this.feedbackTypeCurrent = 'algoFeedback';
    }
    this.feedbackDisabled = false;

    const feedbackJSON = result.feedbackText;
    let feedbackObj: any;
    try {
      feedbackObj = JSON.parse(feedbackJSON);
    } catch {
      this.algoFeedback = "<br>Fehler beim Generieren des Algorithmischen Feedbacks";
      this.llmFeedback = "<br>Fehler beim Generieren des KI Feedbacks";
    }
    
    try {
      if (feedbackObj.algo) {
        this.algoFeedback = '<br>' + feedbackObj.algo.replace(/\n/g, '<br>');
      }
      else {
        this.algoFeedback = "<br>Fehler beim Generieren des Algorithmischen Feedbacks";
      }
    } catch {
      this.algoFeedback = "<br>Fehler beim Generieren des Algorithmischen Feedbacks";
    }

    try {
      if (feedbackObj.llm) {
        this.llmFeedback = '<br>' + feedbackObj.llm.replace(/\n/g, '<br>');
      }
      else {
        this.llmFeedback = "<br>Fehler beim Generieren des KI Feedbacks";
      }
    } catch {
      this.llmFeedback = "<br>Fehler beim Generieren des KI Feedbacks";
    }

    if (result.progress === 100) {
      this.progressService.answerSubmitted();
    }
  }


  addNewSolutionStep() {
    // Before adding new step, the current step need to be saved
    if (this.workspaceModePrevious === 'solution'){
      this.saveWorkspaceContent();
    }

    // ###
    // Add new solution step

    // Use the data of the last step for the new step if exists ; else use assignment data
    let last: GraphStructureDTO;

    const numberOfSolutionSteps = this.solutionGraph.length;

    if (numberOfSolutionSteps !== 0) {
      last = this.solutionGraph[numberOfSolutionSteps - 1];
    } 
    else {
      const graphNodes = this.initialStructure.nodes;
      const graphEdges = this.initialStructure.edges;
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
  
  deleteCurrentSolutionStep() {
    if (this.solutionGraph.length > 1) {

      // Remove the current step
      this.solutionGraph.splice(this.solutionStepCurrent, 1);

      // Set the current/previuos step
      if (this.solutionStepCurrent >= this.solutionGraph.length) {
        this.solutionStepCurrent = this.solutionGraph.length - 1;
      }
      if (this.solutionStepCurrent < 0) {
        this.solutionStepCurrent = 0;
      }

      this.solutionStepPrevious = this.solutionStepCurrent;

      // Did not use updateWorkspace function because it would override the removed content from prev step to the new current step
      // Get Current Step
      const graphContent: GraphStructureDTO = this.solutionGraph[this.solutionStepCurrent];

      // To use only values and not the references
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({ graphStructure: clonedGraphContent, graphConfiguration: this.graphQuestionData?.configuration });
    } else {
        console.warn('Not enough steps to delete. Current steps:', this.solutionGraph.length);
    }
  }

  resetSolution() {

    this.confirmationService.confirm({
      title: 'Lösung zurücksetzen',
      message: 'Sind Sie sicher, dass Sie Ihre Lösung zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?',
      acceptLabel: 'Zurücksetzen',
      declineLabel: 'Abbrechen',
      accept: () => {
        // Reset the solution steps
        this.solutionGraph = [];
        this.solutionStepCurrent = 0;
        this.solutionStepPrevious = this.solutionStepCurrent;

        this.workspaceModeCurrent = 'assignment';
        this.workspaceModePrevious = this.workspaceModeCurrent;

        // To use only values and not the references
        this.updateWorkspace();
      }
    });
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
      const graphContent: GraphStructureDTO = this.solutionGraph[this.solutionStepCurrent];

      // To use only values and not the references
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({ graphStructure: clonedGraphContent, graphConfiguration: this.graphQuestionData?.configuration });
    } 

    // Load assignment to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {

      // No configuration
      if (!this.graphQuestionData?.configuration) {
        alert('Keine Konfiguration für Graph gefunden.');
        return
      }

      // Load content and configuration
      this.loadWorkspaceContent({
        graphStructure: JSON.parse(JSON.stringify(this.initialStructure)),
        graphConfiguration: this.graphQuestionData.configuration
      })    

    }

    // Update the previous mode for the future changes
    this.workspaceModePrevious = this.workspaceModeCurrent;
    this.solutionStepPrevious = this.solutionStepCurrent;
  }

  loadWorkspaceContent(params: {
    graphStructure?: GraphStructureDTO,
    graphConfiguration?: GraphConfigurationDTO
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

  navigateToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
