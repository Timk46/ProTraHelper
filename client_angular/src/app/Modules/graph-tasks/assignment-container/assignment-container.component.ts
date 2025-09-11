import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphStructureDTO, GraphConfigurationDTO } from '@DTOs/index';
import { GraphTaskService } from '../services/graph-task.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { GraphQuestionDTO, QuestionDTO } from '@DTOs/index';
import { questionType } from '@DTOs/index';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/index';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { structuresAreEqual } from '../utils';
import { AiFeedbackService } from '../services/ai-feedback.service';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogConfig } from '@angular/material/dialog';
import { GraphTutorialDialogComponent } from '../graph-tutorial-dialog/graph-tutorial-dialog.component';

@Component({
  selector: 'app-assignment-container',
  templateUrl: './assignment-container.component.html',
  styleUrls: ['./assignment-container.component.scss'],
})
export class AssignmentContainerComponent implements OnInit {
  // ### workspace/solution related
  workspaceModePrevious: string = 'assignment';
  workspaceModeCurrent: string = 'assignment';
  solutionStepPrevious: number = 0;
  solutionStepCurrent: number = 0;

  initialStructure: GraphStructureDTO = {
    nodes: [],
    edges: [],
  };

  solutionGraph: GraphStructureDTO[] = [];

  lastSubmittedGraph: GraphStructureDTO[] | null = null;

  thisQuestionType = questionType.GRAPH;

  questionData: QuestionDTO | null = null;
  graphQuestionData: GraphQuestionDTO | null = null;
  // ### feedback related
  feedbackState: 'INITIAL' | 'ALGO' | 'LLM' | 'FEEDBACK_RATED' = 'INITIAL';
  feedbackTypeCurrent: 'algoFeedback' | 'llmFeedback' | '' = '';
  llmFeedbackId: number = -1;
  algoFeedback: string = '';
  llmFeedback: string = '';
  feedbackDisabled: boolean = true;

  rating: number = 0;
  hoverState: number = 0;

  userAnswerId: number = -1;

  isSending: boolean = false;

  private conceptId!: number;
  private questionId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly confirmationService: ConfirmationService,
    private readonly progressService: ProgressService,
    private readonly graphTaskService: GraphTaskService,
    private readonly aiFeedbackService: AiFeedbackService,
    private readonly questionDataService: QuestionDataService,
    private readonly dialog: MatDialog,
  ) {
    this.route.queryParamMap.subscribe(params => {
      this.conceptId = Number(params.get('concept'));
      this.questionId = Number(params.get('questionId'));
      console.log('AssignmentContainerComponent constructor', this.questionId, this.conceptId);
    });
  }

  ngOnInit(): void {
    // get assignment id from url
    if (!this.questionId) {
      this.snackBar.open('Keine Frage ID gefunden!', 'Schließen', { duration: 5000 });
      return;
    }
    // reset the state of the graph service
    this.graphTaskService.resetGraph();

    // get question details
    this.questionDataService.getGraphQuestion(this.questionId).subscribe({
      next: graphQuestionData => {
        this.questionDataService.getQuestionData(this.questionId).subscribe({
          next: questionData => {
            if (questionData.type === questionType.GRAPH) {
              // TODO: entsprechende questionType anstelle des Strings, testen.
              this.graphQuestionData = graphQuestionData;
              this.initialStructure = JSON.parse(
                JSON.stringify(this.graphQuestionData.initialStructure),
              );
              this.questionData = questionData;
              this.updateWorkspace();
            } else {
              this.snackBar.open(
                'ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Graphaufgabe!',
                'Schließen',
                { duration: 5000 },
              );
              this.thisQuestionType = questionData.type as questionType;
            }
          },
          error: err => {
            this.snackBar.open('Fehler beim Laden der Frage!', 'Schließen', { duration: 5000 });
          },
        });
      },
      error: err => {
        this.snackBar.open('Fehler beim Laden der Frage!', 'Schließen', { duration: 5000 });
      },
    });

    // get the last submitted solution by the user
    this.questionDataService.getNewestUserAnswer(this.questionId).subscribe({
      next: data => {
        if (data.userGraphAnswer) {
          this.solutionGraph = data.userGraphAnswer;
          this.workspaceModeCurrent = 'solution';
          this.updateWorkspace();
        }
      },
      error: err => {
        this.snackBar.open('Fehler beim Laden der letzten abgegebenen Antwort', 'Schließen', {
          duration: 5000,
        });
      },
    });
  }

  onSubmitButtonClick() {
    if (!this.graphQuestionData) {
      return;
    }

    // To save workpace content if it is in solution mode
    this.updateWorkspace();
    this.feedbackState = 'ALGO';
    this.feedbackTypeCurrent = 'algoFeedback';
    this.isSending = true;
    this.algoFeedback = '';
    this.llmFeedback = '';

    // reset userAnswerId as it is used to generate ai feedback for the last submitted user answer
    this.userAnswerId = -1;

    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.graphQuestionData.questionId,
      contentElementId: this.graphQuestionData.contentElementId,
      userId: -1,
      userGraphAnswer: this.solutionGraph,
    };

    console.log(JSON.stringify(userAnswerData, null, 2));
    this.questionDataService.createUserAnswer(userAnswerData).subscribe({
      next: result => {
        console.log(result);
        this.lastSubmittedGraph = JSON.parse(JSON.stringify(this.solutionGraph));
        this.handleGraphSubmissionResponse(result);
      },
      error: err => {
        this.snackBar.open('Fehler bei der Abgabe der Antwort!', 'Schließen', { duration: 5000 });
        this.isSending = false;
      },
    });
  }

  handleGraphSubmissionResponse(result: userAnswerFeedbackDTO): void {
    console.log(result);
    this.isSending = false;

    this.userAnswerId = result.userAnswerId;

    // for first submission, enable the feedback and set the feedback type to algoFeedback
    if (this.feedbackDisabled) {
      this.feedbackTypeCurrent = 'algoFeedback';
    }

    this.feedbackDisabled = false;
    if (result.feedbackText) {
      this.algoFeedback = '<br>' + result.feedbackText.replace(/\n/g, '<br>');
    } else {
      this.algoFeedback = '<br>Fehler beim Generieren des Algo Feedbacks';
    }

    if (result.progress === 100) {
      this.progressService.answerSubmitted();
    }
  }

  onFeedbackTypeChange() {
    // To save workpace content if it is in solution mode, as it will check if the structure is the same as the last submitted one
    this.updateWorkspace();

    if (this.feedbackTypeCurrent === 'llmFeedback') {
      if (this.feedbackState === 'LLM' || this.feedbackState === 'FEEDBACK_RATED') {
        return;
      }

      // If structure has changed since last submission, ask for submission
      let solutionsAreEqual = true;

      if (this.lastSubmittedGraph === null) {
        solutionsAreEqual = false;
      } else if (this.solutionGraph.length !== this.lastSubmittedGraph?.length) {
        solutionsAreEqual = false;
      } else {
        for (let i = 0; i < this.solutionGraph.length; i++) {
          if (!structuresAreEqual(this.solutionGraph[i], this.lastSubmittedGraph[i])) {
            solutionsAreEqual = false;
            break;
          }
        }
      }

      if (!solutionsAreEqual) {
        this.confirmationService.confirm({
          title: 'Neue Lösung abgeben',
          message:
            'Die aktuelle Lösung unterscheidet sich von der zuletzt abgegeben Lösung. Sie müssen die aktuelle Lösung abgeben, um KI-Feedback zu erhalten. Abgeben?',
          acceptLabel: 'Abgeben',
          declineLabel: 'Abbrechen',
          accept: () => {
            this.onSubmitButtonClick();
          },
          decline: () => {
            this.llmFeedback =
              '<br> Die aktuelle Lösung muss abgegeben werden, um KI-Feedback zu erhalten.';
          },
        });
        return;
      }

      this.onGetAIFeedbackClick();
    }
  }

  onGetAIFeedbackClick() {
    if (!this.graphQuestionData) {
      return;
    }

    // To save workpace content if it is in solution mode
    this.updateWorkspace();
    this.isSending = true;
    this.feedbackTypeCurrent = 'llmFeedback';
    this.llmFeedback = '<br> Feedback wird geladen...';

    this.aiFeedbackService.generateGraphAIFeedback(this.userAnswerId).subscribe({
      next: result => {
        this.llmFeedbackId = result.feedbackId;
        this.llmFeedback = '<br>' + result.feedback.replace(/\n/g, '<br>');
        this.isSending = false;
        this.feedbackState = 'LLM';
      },
      error: err => {
        this.snackBar.open('Fehler beim Generieren des KI-Feedbacks!', 'Schließen', {
          duration: 5000,
        });
        this.llmFeedbackId = -1;
        this.llmFeedback = '';
        this.isSending = false;
        this.feedbackTypeCurrent = 'algoFeedback';
      },
    });
  }

  sendStudentFeedback(starRating: number): void {
    this.hoverState = 0;

    if (
      starRating !== 1 &&
      starRating !== 2 &&
      starRating !== 3 &&
      starRating !== 4 &&
      starRating !== 5
    ) {
      throw new Error('Invalid star rating: ' + starRating);
    }

    this.aiFeedbackService.rateGraphAIFeedback(this.llmFeedbackId, starRating).subscribe({
      next: response => {
        this.feedbackState = 'FEEDBACK_RATED';
        this.snackBar.open('Feedback Vielen Dank für Ihr Feedback!', 'Schließen', {
          duration: 5000,
        });
      },
      error: error => {
        this.snackBar.open('Fehler beim Senden des Feedbacks!', 'Schließen', { duration: 5000 });
      },
    });
  }

  // Some Functionality for the Star Rating: Selecting a star, hovering over a star, resetting hover state.
  onStar(star: number): void {
    this.rating = star;
  }

  onMouseEnter(star: number): void {
    this.hoverState = star;
  }
  onMouseLeave(): void {
    this.hoverState = 0;
  }

  addNewSolutionStep() {
    // Before adding new step, the current step need to be saved
    if (this.workspaceModePrevious === 'solution') {
      this.saveWorkspaceContent();
    }

    // ###
    // Add new solution step

    // Use the data of the last step for the new step if exists ; else use assignment data
    let last: GraphStructureDTO;

    const numberOfSolutionSteps = this.solutionGraph.length;

    if (numberOfSolutionSteps !== 0) {
      last = this.solutionGraph[numberOfSolutionSteps - 1];
    } else {
      const graphNodes = this.initialStructure.nodes;
      const graphEdges = this.initialStructure.edges;
      if (graphNodes !== undefined && graphEdges !== undefined) {
        last = {
          nodes: graphNodes,
          edges: graphEdges,
        };
      } else {
        last = {
          nodes: [],
          edges: [],
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
      this.loadWorkspaceContent({
        graphStructure: clonedGraphContent,
        graphConfiguration: this.graphQuestionData?.configuration,
      });
    } else {
      console.warn('Not enough steps to delete. Current steps:', this.solutionGraph.length);
    }
  }

  resetSolution() {
    this.confirmationService.confirm({
      title: 'Lösung zurücksetzen',
      message:
        'Sind Sie sicher, dass Sie Ihre Lösung zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?',
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
      },
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
        this.addNewSolutionStep();
      }

      // Get Current Step
      const graphContent: GraphStructureDTO = this.solutionGraph[this.solutionStepCurrent];

      // To use only values and not the references
      const clonedGraphContent: GraphStructureDTO = JSON.parse(JSON.stringify(graphContent));
      this.loadWorkspaceContent({
        graphStructure: clonedGraphContent,
        graphConfiguration: this.graphQuestionData?.configuration,
      });
    }

    // Load assignment to the workspace
    else if (this.workspaceModeCurrent === 'assignment') {
      // No configuration
      if (!this.graphQuestionData?.configuration) {
        alert('Keine Konfiguration für Graph gefunden.');
        return;
      }

      // Load content and configuration
      this.loadWorkspaceContent({
        graphStructure: JSON.parse(JSON.stringify(this.initialStructure)),
        graphConfiguration: this.graphQuestionData.configuration,
      });
    }

    // Update the previous mode for the future changes
    this.workspaceModePrevious = this.workspaceModeCurrent;
    this.solutionStepPrevious = this.solutionStepCurrent;
  }

  loadWorkspaceContent(params: {
    graphStructure?: GraphStructureDTO;
    graphConfiguration?: GraphConfigurationDTO;
  }) {
    let { graphStructure, graphConfiguration } = params;

    // Reset
    this.graphTaskService.resetGraph();

    if (graphConfiguration) {
      // TODO: does configuration need to set here or better somewhere else?
      this.graphTaskService.configureGraph(graphConfiguration);
    }

    // Set data
    if (graphStructure === undefined || graphStructure === null) {
      graphStructure = { nodes: [], edges: [] };
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
    console.log('navigateToDashboard', this.conceptId);
    if (this.conceptId) {
      console.log('navigateToDashboard with conceptId', this.conceptId);
      this.router.navigate(['/dashboard', 'concept', this.conceptId]);
    } else {
      console.log('navigateToDashboard without conceptId');
      this.router.navigate(['/dashboard']);
    }
  }

  openTutorialDialog() {
    // Dialog can be configured here using MatDialogConfig

    // const dialogConfig = new MatDialogConfig();
    // dialogConfig.maxWidth = '70vw';
    // dialogConfig.maxHeight = '95vh';

    // Open the dialog
    // const dialogRef =
    this.dialog.open(
      GraphTutorialDialogComponent,
      //  ,dialogConfig
    );
  }
}
