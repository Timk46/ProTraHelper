import { Component, ViewChild } from '@angular/core';
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { CodeGameTaskDataService } from "../../services/code-game-task-data.service";
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";

enum States {
  startState = 0, // start state - before a task is selected (hide code editor)
  editingCode = 1, // after a task is selected (show code editor)
}

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent;

  selectedLanguage: string = 'cpp';
  code: string = '';
  compilerOutput: string | null = '';
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
        });
      }
    });
  }

  onCodeChanged(newCode: string): void {
    console.log('Code changed: ', newCode);

  }

  submitCode(): void {
    this.compilerOutput = 'Compiling...';

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

          this.compilerOutput = response.output.toString();
        },
        error: (error) => {
          console.error('Error: ', error);
          this.compilerOutput = error.message;
        }
      });
  }
}
