import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { CodeGameTaskDataService } from "../../services/code-game-task-data.service";
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import { PlayfieldComponent } from "../playfield/playfield.component";

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

  selectedLanguage: string = 'cpp';
  code: string = '';
  compilerConsoleOutputView: string | null = ''; // to show the compiler output
  compilerGameOutputView: string[] = []; // used to simulate the game
  currentTaskId: number = 0;
  currentTask: detailedQuestionDTO | undefined;
  taskDescription: string = 'Das Programmierspiel von GOALS';
  currentState: States = States.startState;
  protected readonly States = States;

  // flags to control the elements in the view
  isLoading: boolean = false;
  submitButtonIsDisabled: boolean = false;
  isGameAnimationFinished: boolean = false;
  resetButtonIsDisabled: boolean = true;
  showCompilerOutput: boolean = false;
  reachedDestination: boolean = false;
  totalRocks: number = 0;
  collectedRocks: number = 0;

  constructor(
    private title: Title,
    private codeGameTaskDataService: CodeGameTaskDataService,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.getCurrentTaskFromRoute();
    this.title.setTitle('GOALS: Code Game');
  }

  // Event handler to get notified when the game animation has finished by the playfield component
  onGameAnimationFinished(event: { reachedDestination: boolean, totalRocks: number, collectedRocks: number }): void {
    this.reachedDestination = event.reachedDestination;
    this.totalRocks = event.totalRocks;
    this.collectedRocks = event.collectedRocks;

    this.isGameAnimationFinished = true;
    this.resetButtonIsDisabled = false;
  }

  getCurrentTaskFromRoute(): void {
    this.route.params.subscribe((params) => {
      const taskId = params['taskId'];
      if (taskId) {
        this.currentTaskId = taskId;
        this.codeGameTaskDataService.getCodeGameTask(this.currentTaskId).subscribe((task) => {
          this.currentTask = task;
          this.taskDescription = this.currentTask?.codeGameQuestion!.text;
          this.currentState = States.editingCode;

          console.log('Current task: ', this.currentTask);

          // trigger playfield component to load the game
          this.playfieldComponent?.initGameField(this.currentTask?.codeGameQuestion!.game);
        });
      }
    });
  }

  onCodeChanged(newCode: string): void {
    console.log('Code changed: ', newCode);

  }

  submitCode(): void {
    this.submitButtonIsDisabled = true;
    this.isLoading = true;
    this.compilerConsoleOutputView = 'Compiling...';

    const mainFile: { [fileName: string]: string } = {};
    const additionalFiles: { [fileName: string]: string } = {};
    const gameFile: { [fileName: string]: string } = {};

    if (this.currentTask) {
      for (const file of this.currentTask.codeGameQuestion!.codeGameScaffolds) {
        if (file.codeFileName === this.currentTask.codeGameQuestion!.mainFileName) {
          mainFile[file.codeFileName] = file.code;
        } else {
          additionalFiles[file.codeFileName] = file.code;
        }
      }

      gameFile[this.currentTask.codeGameQuestion!.gameFileName] = this.currentTask.codeGameQuestion!.game;
    }

    this.codeGameTaskDataService
      .executeCodeGameTask(mainFile, additionalFiles, gameFile)
      .subscribe({
        next: (response) => {
          console.log('Response: ', response);

          this.splitCompilerOutputAndStartGame(response.output.toString());
        },
        error: (error) => {
          console.error('Error: ', error);
          this.compilerConsoleOutputView = error.message;
        },
        complete: () => {
          this.isLoading = false;
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
    this.reachedDestination = false;
    this.totalRocks = 0;
    this.collectedRocks = 0;
  }
}
