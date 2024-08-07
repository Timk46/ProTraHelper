import { Component, HostListener, OnInit, ViewChild } from "@angular/core";
import { RunCodeService } from "../../services/runCode.service";
import { TaskDataService } from "../../services/task-data.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CodeSubmissionResultDto, QuestionDTO } from "@DTOs/index";
import { FormArray, FormBuilder, Validators } from "@angular/forms";
import { saveAs } from "file-saver";
import * as JSZip from "jszip";
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { MarkdownService } from "../../services/markdown/markdown.service";
import { VideoTimeStampComponent } from '../video-time-stamp/video-time-stamp.component';
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute } from '@angular/router';
import { ConfettiService } from "src/app/Services/animations/confetti.service";
import { Title } from '@angular/platform-browser';
/**
 * The different states representing the current status of the student workspace.
 */
enum States {
  startState = 0, // start state - before a task is selected (hide code editor)
  editingCode = 1, // after a task is selected (show code editor)
  submittedCode = 2, // after code is submitted (show buttom textfield for feedback
  startGeneratingKIFeedback = 3, // begin animation for generating feedback
  receivingKIFeedback = 3.5, // stops animation for generating feedback and display streamed response
  finishedGeneratingKIFeedback = 4, // end animation for generating feedback and display stars and textfield for feedback
  sendStudentFeedback = 5, // student feedback is sent to the server
}

@Component({
  selector: 'app-student-workspace',
  templateUrl: './student-workspace.component.html',
  styleUrls: ['./student-workspace.component.scss'],
})
export class StudentWorkspaceComponent implements OnInit {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent; // we get access to the codeEditorComponent and can call its methods

  currentState: States = States.startState;
  selectedLanguage: string = 'python';
  currentTask: QuestionDTO | undefined;
  currentTaskId: number = 0;
  tasks: QuestionDTO[] = [];
  tasksOfSelectedWeek: QuestionDTO[] = [];
  flavor: string = 'Feedback mit Konzept-Erklärung';
  flavorOptions: string[] = [
    'Standard Feedback',
    'Feedback mit Konzept-Erklärung',
  ];

  selectedWeek = 0;
  rating: number = 0;
  hoverState: number = 0;
  feedback: string = '';
  defaultWeek: number = 0;
  taskDescription: string =
    'Hi :)\n ich bin Kai. Ich bin hier, um dir Feedback zu deinen Lösungen zu geben.';
  isLoading: boolean = false;
  compilerOutput: string | null = '';
  feedbackMessage: string =
    'Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben. Führe dafür erst deinen Programmcode aus und klicke dann auf den Button "Feedback erzeugen".';
  currentLoadingFeedbackMessage: string = '';
  lastResult: any;

  supportedLanguages = [
    { name: 'Python', value: 'python' },
    { name: 'Java', value: 'java' },
    { name: 'TypeScript', value: 'typescript' },
  ];

  constructor(
    private runCodeService: RunCodeService,
    private taskDataService: TaskDataService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
    private markdownService: MarkdownService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private confettiService: ConfettiService,
    private title: Title
  ) {}

  /**
   * Initialize the component by getting question data from the API.
   * The default week is set to the highest week number.
   */
  ngOnInit(): void {
    this.getCurrentTaskFromRoute();
    this.title.setTitle('GOALS: Tutor Kai');
  }

  getCurrentTaskFromRoute(): void {
    this.route.params.subscribe((params) => {
      const taskId = params['taskId'];
      if (taskId) {
        this.currentTaskId = taskId;
        this.taskDataService.getTask(this.currentTaskId).subscribe((task) => {
          this.currentTask = task;
          this.taskDescription = this.currentTask?.codingQuestion!.textHTML;
          this.currentState = States.editingCode;
        });
      }
    });
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(target.getAttribute('href'));
    }
  }
  private openModal(href: string | null) {
    this.dialog.open(VideoTimeStampComponent, { data: { href } });
  }

  /**
   * Handles the event when the code is changed.
   * This is important because the code submitted for execution needs to match the one which is submitted for feedback.
   * If the student changes the code after exection, he needs to execute it again before he can ask for feedback.
   * @param newCode The new code value. (gets emitted by code-editor component)
   */
  onCodeChanged(newCode: string): void {
    // prevent state resetting change if feedback is already in generation
    if (this.currentState != States.startGeneratingKIFeedback && this.currentState!= States.receivingKIFeedback && this.currentState!= States.finishedGeneratingKIFeedback) {
      this.currentState = States.editingCode;
    }
  }

  /**
   * Send student feedback to the API.
   */
  sendStudentFeedback(): void {
    this.currentState = States.sendStudentFeedback;
    this.runCodeService
      .postFeedback(this.rating, this.feedback, this.lastResult.encryptedCodeSubissionId)
      .subscribe({
        next: (response) => {
          this.openSnackBar('Vielen Dank für Ihr Feedback!', 'done');
        },
        error: (error) => {
          this.checkError(error);
        },
      });
  }

  /**
   * Get AI-generated feedback for the user's code.
   */
  getKIFeedback(): void {
    this.rating = 0;
    this.currentState = States.startGeneratingKIFeedback;
    this.feedbackMessage =
      'Lass mich einen Augenblick über die Aufgabe nachdenken...';
    let submitCode = '';
    if (this.currentTask) {
      for (const file of this.currentTask.codingQuestion!.codeGerueste) {
        submitCode +=
          '## Code in ' + file.codeFileName + '\n' + file.code + '\n\n'; // all studencode in markdown string format
      }
    }

    let isFirstResponse = true;
    this.currentLoadingFeedbackMessage = '';
    this.runCodeService
      .getKiFeedback(
        this.currentTaskId,
        this.flavor,
        this.lastResult
      )
      .subscribe({
        next: (response) => {
          if (isFirstResponse) {
            this.currentState = States.receivingKIFeedback;

            isFirstResponse = false;
          }
          this.currentLoadingFeedbackMessage = response;
          this.feedbackMessage = this.markdownService.parse(response);
        },
        error: (error) => {
          this.checkError(error);
        },
        complete: () => {
          //console.log(this.currentLoadingFeedbackMessage);
          this.currentState = States.finishedGeneratingKIFeedback;
        },
      });
  }

  /**
   * Submit user's code to the API for execution.
   */
  submitCode(): void {
    this.isLoading = true;
    const inputArgs = this.argsArray.value;
    const additionalFiles: { [fileName: string]: string } = {};
    if (this.currentTask) {
      for (const file of this.currentTask.codingQuestion!.codeGerueste) {
        additionalFiles[file.codeFileName] = file.code;
      }
    }
    this.runCodeService
      .executeStudentCode(this.currentTaskId, inputArgs, additionalFiles)
      .subscribe({
        next: (result) => {
          this.handleCodeSubmissionResponse(result);
        },
        error: (error) => {
          this.checkError(error);
          this.isLoading = false;
        },
      });
  }

  /**
   * Handle the response from the API after submitting code.
   *
   * @param result - The API response data.
   */
  handleCodeSubmissionResponse(result: CodeSubmissionResultDto): void {
    //console.log(result);
    this.lastResult = result;
    this.compilerOutput = result.CodeSubmissionResult.output;
    this.compilerOutput +=
      result.CodeSubmissionResult.output.length === 0 ? 'Keine Ausgabe' : '';
    this.isLoading = false;
    this.feedbackMessage = 'Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben. Führe dafür erst deinen Programmcode aus und klicke dann auf den Button "Feedback erzeugen".';
    this.currentState = States.submittedCode;
    if (result.CodeSubmissionResult.score === 100) {
      this.confettiService.celebrate(6,800); // small confetti animation :)
    }
    result.CodeSubmissionResult.score = Math.trunc(result.CodeSubmissionResult.score);
  }

  /**
   * Download task files as a single .zip file or individual files.
   */
  downloadFiles(): void {
    if (!this.currentTask) {
      return;
    }

    if (this.currentTask.codingQuestion!.codeGerueste.length === 1) {
      const codeGerueste = this.currentTask.codingQuestion!.codeGerueste[0];
      const blob = new Blob([codeGerueste.code], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, codeGerueste.codeFileName);
    } else if (this.currentTask.codingQuestion!.codeGerueste.length > 1) {
      const zip = new JSZip();
      for (const codeGerueste of this.currentTask.codingQuestion!
        .codeGerueste) {
        zip.file(codeGerueste.codeFileName, codeGerueste.code);
      }
      zip.generateAsync({ type: 'blob' }).then((blob) => {
        saveAs(blob, `${this.currentTask?.name}.zip`);
      });
    }
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

  // For the dynamic input fields (some java tasks require input args from the user):
  /**
   * Create input fields for the argsArray form control.
   *
   * @param count - The number of input fields to create.
   */
  createInputArgs(count: number): void {
    this.argsArray.clear(); // delete old ones
    for (let i = 0; i < count; i++) {
      this.argsArray.push(this.formBuilder.control(null, Validators.required)); // create new ones
    }
  }
  // Form and FormControl
  inputArgsForm = this.formBuilder.group({
    argsArray: this.formBuilder.array([]),
  });
  get argsArray(): FormArray {
    return this.inputArgsForm.get('argsArray') as FormArray;
  }

  /**
   * Change the task being edited by the user.
   *
   * @param index - The index of the task to change to.
   */
  changeTask(index: number): void {
    this.currentState = States.editingCode;
    this.currentTaskId = index;
    this.currentTask = this.findQuestionById(index); //changing current task automatically changes the code inside the editor - check html
    //this.codeEditorComponent?.changeLanguage(this.selectedLanguage);
    if (this.currentTask) {
      this.selectedLanguage =
        this.currentTask.codingQuestion!.programmingLanguage;
      this.taskDescription = this.currentTask?.codingQuestion!.textHTML;
    }

    // Add Input Args if there are any
    if (
      this.currentTask &&
      this.currentTask.codingQuestion!.countInputArgs !== undefined
    ) {
      this.createInputArgs(this.currentTask.codingQuestion!.countInputArgs);
    }
  }

  findQuestionById(id: number): QuestionDTO | undefined {
    return this.tasks.find((question) => question.id === id);
  }

  getTooltipText(
    test: string,
    status: string,
    exception: string
  ): string {
    return `Testname: ${test} --
    Passed: ${status}` +
    (exception ? ` -- Exception: ${exception}` : '');
  }

  /**
   * Show errors in console and as Snackback.
   */
  checkError(error: any): void {
    console.error(error);
    this.openSnackBar(
      'Ein Fehler ist aufgetreten. Bitte Konsole überprüfen.',
      'Warning'
    );
  }
  openSnackBar(message: string, icon: string): void {
    this.snackBar.open(message, '', {
      duration: 2500,
      panelClass: ['snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
