import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { CodeGameTaskDataService } from "../../services/code-game-task-data.service";
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import { PlayfieldComponent } from "../playfield/playfield.component";
import {CodeGameEvaluationDTO} from "@DTOs/codeGame.dto";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { HelpDialogComponent } from "../help-dialog/help-dialog.component";

enum States { // TODO: check if needed
  startState = 0, // before task is loaded
  editingCode = 1, // task is loaded
}

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent;
  @ViewChild('playfield') playfieldComponent?: PlayfieldComponent;
  @Output() gameLoaded = new EventEmitter<void>();

  TIMEOUT_DURATION = 5000; // 5 seconds

  selectedLanguage: string = 'cpp';
  code: string = '';
  compilerConsoleOutputView: string | null = ''; // to show the compiler output
  compilerGameOutputView: string[] = []; // used to simulate the game
  currentTaskId: number = 0;
  currentTask: detailedQuestionDTO | undefined;
  taskDescription: string = 'Das Programmierspiel von GOALS';
  currentState: States = States.startState;
  protected readonly States = States;
  codeGameEvaluation: CodeGameEvaluationDTO | undefined;

  // flags to control the elements in the view and evaluate the assignment
  isLoading: boolean = false;
  submitButtonIsDisabled: boolean = false;
  isGameAnimationFinished: boolean = false;
  resetButtonIsDisabled: boolean = true;
  showCompilerOutput: boolean = false;
  codeSolutionRestriction: boolean = false; // if the code solution has restrictions
  methodNameToRestrict: string = ''; // name of the method to restrict
  frequencyOfMethodEvaluationResult: boolean = false; // if the code fulfills the restrictions
  frequencyOfMethodCallsResult: number = 0; // number of method calls
  reachedDestination: boolean = false;
  allItemsCollected: boolean = false;
  totalItems: number = 0;
  collectedItems: number = 0;
  visitedCellsAreAllowed: boolean = false;
  allWhiteListCellsVisited: boolean = false;

  constructor(
    private title: Title,
    private codeGameTaskDataService: CodeGameTaskDataService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.getCurrentTaskFromRoute();
    this.title.setTitle('GOALS: Code Game');
  }

  getCurrentTaskFromRoute(): void {
    this.route.params.subscribe((params) => {
      const taskId = params['taskId'];
      if (taskId) {
        this.currentTaskId = parseInt(taskId, 10);
        this.codeGameTaskDataService.getCodeGameTask(this.currentTaskId).subscribe((task) => {
          this.currentTask = task;
          this.taskDescription = this.currentTask?.codeGameQuestion!.text;
          this.selectedLanguage = this.currentTask?.codeGameQuestion!.programmingLanguage;
          this.currentState = States.editingCode;
          this.codeSolutionRestriction = this.currentTask?.codeGameQuestion!.codeSolutionRestriction || false;
          this.methodNameToRestrict = this.currentTask?.codeGameQuestion!.methodNameToRestrict || '';

          console.log('CodeGame: Current task: ', this.currentTask); // TODO: remove

          this.title.setTitle('GOALS: ' + this.currentTask?.name);
          this.codeEditorComponent?.changeLanguage(this.selectedLanguage);

          // trigger playfield component to load the game
          this.playfieldComponent?.initGameField(
            this.currentTask?.codeGameQuestion!.game,
            this.currentTask?.codeGameQuestion!.theme,
            this.currentTask?.codeGameQuestion!.gameCellRestrictions
          );
        });
      }
    });
  }

  getTitle(): string {
    return this.title.getTitle();
  }

  // Event handler to get notified when the game animation has finished by the playfield component
  onGameAnimationFinished(): void {
    this.isGameAnimationFinished = true;
    this.resetButtonIsDisabled = false;
  }

  onCodeChanged(newCode: string): void {}

  submitCode(): void {
    // reset
    this.codeGameEvaluation = undefined;
    this.frequencyOfMethodEvaluationResult = false;
    this.frequencyOfMethodCallsResult = 0;
    this.reachedDestination = false;
    this.allItemsCollected = false;
    this.totalItems = 0;
    this.collectedItems = 0;
    this.visitedCellsAreAllowed = false;
    this.allWhiteListCellsVisited = false;

    this.submitButtonIsDisabled = true;
    this.isLoading = true;
    this.compilerConsoleOutputView = 'Compiling...';

    const mainFile: { [fileName: string]: string } = {};
    const additionalFiles: { [fileName: string]: string } = {};
    const gameFile: { [fileName: string]: string } = {};

    if (this.currentTask) {
      for (const file of this.currentTask.codeGameQuestion!.codeGameScaffolds) {
        if (file.mainFile) {
          mainFile[file.codeFileName] = file.code;
        } else {
          additionalFiles[file.codeFileName] = file.code;
        }
      }

      gameFile[this.currentTask.codeGameQuestion!.gameFileName] = this.currentTask.codeGameQuestion!.game;
    }

    /* Submit Answer, run the code and get evaluation results */
    // Submit the code to the server to run the game
    this.codeGameTaskDataService
      .executeCodeGameTask(this.currentTask?.id, this.selectedLanguage, mainFile, additionalFiles, gameFile)
      .subscribe({
        next: (response) => {
          if (response.success === false) {
            if (response.message === 'Execution timed out') {
              this.snackBar.open('Die Anfrage dauert zu lange. Bitte versuchen Sie es erneut.', 'Schließen', { duration: 3000 });
            } else {
              this.snackBar.open('Fehler bei der Ausführung.', 'Schließen', { duration: 3000 });
            }

            this.codeGameEvaluation = response.result; // For saving the user task try
            this.resetGame(); // Enables to try again
            return; // Jump to the complete block
          }
          
          if (response.success === true) {
            // Get evaluation results
            this.codeGameEvaluation = response.result;
            this.frequencyOfMethodEvaluationResult = response.result.frequencyOfMethodEvaluationResult;
            this.frequencyOfMethodCallsResult = response.result.frequencyOfMethodCallsResult;
            this.reachedDestination = response.result.reachedDestination;
            this.allItemsCollected = response.result.allItemsCollected;
            this.totalItems = response.result.totalItems;
            this.collectedItems = response.result.collectedItems;
            this.visitedCellsAreAllowed = response.result.visitedCellsAreAllowed;
            this.allWhiteListCellsVisited = response.result.allWhiteListCellsVisited;

            // Prepare and start animation of the game
            this.splitCompilerOutputAndStartGame(response.result.codeGameExecutionResult.toString());
          }
        },
        error: (error) => {
          console.error('Error: ', error);
          this.compilerConsoleOutputView = error.message;
        },
        complete: () => {
          this.isLoading = false;

          // Submit the user answer and evaulation to the server
          this.codeGameTaskDataService
            .submitCodeGameUserAnswer(
              this.currentTaskId,
              this.currentTask?.codeGameQuestion?.contentElementId ?? -1,
              this.selectedLanguage,
              this.codeGameEvaluation ?? {} as CodeGameEvaluationDTO)
            .subscribe({
              next: (response: any) => {
                console.log('CodeGame: Submit Response: ', response);
              },
              error: (error: any) => {
                console.error('Error: ', error);
              }
            });
        }
      });
  }

  splitCompilerOutputAndStartGame(compilerOutput: string): void {
    // split the output vor the game view and the compiler output
    // lines staring with # needed for the game view
    const lines = compilerOutput.split('\n');
    let gameOutput: string[] = [];
    let remainingOutput = '';

    lines.forEach(line => {
      if (line.startsWith('#')) {
        gameOutput.push(line);
      } else {
        remainingOutput += line + '\n';
      }
    });

    this.compilerGameOutputView = gameOutput;
    this.playfieldComponent?.startGame(this.compilerGameOutputView);
    this.compilerConsoleOutputView = remainingOutput;
    this.showCompilerOutput = true;
    this.isGameAnimationFinished = false;
  }

  resetGame(): void {
    this.showCompilerOutput = false;
    this.compilerConsoleOutputView = '';

    // notify the playfield component to reset the game
    this.playfieldComponent?.resetGame();

    this.isGameAnimationFinished = false;
    this.resetButtonIsDisabled = true;
    this.submitButtonIsDisabled = false;
    this.frequencyOfMethodEvaluationResult = false;
    this.frequencyOfMethodCallsResult = 0;
    this.reachedDestination = false;
    this.allItemsCollected = false;
    this.totalItems = 0;
    this.collectedItems = 0;
    this.visitedCellsAreAllowed = false;
    this.allWhiteListCellsVisited = false;
  }

  showHelp(): void {
    this.dialog.open(HelpDialogComponent, {
      width: '100vh',
      data: { language: this.selectedLanguage }
    });
  }
}
