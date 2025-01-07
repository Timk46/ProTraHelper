import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { CodeGameTaskDataService } from "../../services/code-game-task-data.service";
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import { PlayfieldComponent } from "../playfield/playfield.component";

enum States {
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
    this.compilerConsoleOutputView = 'Compiling...';

    // TODO: loading spinner

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

          this.splitCompilerOutput(response.output.toString());
        },
        error: (error) => {
          console.error('Error: ', error);
          this.compilerConsoleOutputView = error.message;
        }
      });
  }

  splitCompilerOutput(compilerOutput: string): void {
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
  }

  protected readonly States = States;
}
