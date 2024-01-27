import { Component, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { RunCodeService } from "../../services/runCode.service";
import { TaskDataService } from "../../services/task-data.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CodeSubmissionResultDto, Judge0Dto, QuestionDto } from "@DTOs/index";
import { FormArray, FormBuilder, Validators } from "@angular/forms";
import { saveAs } from "file-saver";
import * as JSZip from "jszip";
import { CodeEditorComponent } from "../code-editor/code-editor.component";
import { MarkdownService } from "../../services/markdown/markdown.service";
import { VideoTimeStampComponent } from '../video-time-stamp/video-time-stamp.component';
import { MatDialog } from "@angular/material/dialog";
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
  selector: "app-student-workspace",
  templateUrl: "./student-workspace.component.html",
  styleUrls: ["./student-workspace.component.scss"],
})

export class StudentWorkspaceComponent implements OnInit {
  @ViewChild('codeEditorMonaco') codeEditorComponent?: CodeEditorComponent; // we get access to the codeEditorComponent and can call its methods

  currentState: States = States.startState;
  selectedLanguage: string = "python";
  currentTask: QuestionDto | undefined;
  currentTaskId: number = 0;
  tasks: QuestionDto[] = [];
  tasksOfSelectedWeek: QuestionDto[] = [];
  flavor: string = 'Schnelles Feedback';
  flavorOptions: string[] = ['Schnelles Feedback', 'Feedback mit Vorlesungsinformationen'];

  selectedWeek = 0;
  rating: number = 0;
  hoverState: number = 0;
  feedback: string = "";
  lastSubmissionId: string = ""; // encrypted - only server can decrypt
  defaultWeek: number = 0;
  taskDescription: string =
    "Hi :)\n ich bin Kai. Ich bin hier, um dir Feedback zu deinen Lösungen zu geben.\n Wähle hierzu zunächst oben im Dropdown eine Aufgabe aus. Im rechten Fenster kannst du deinen Programmcode eingeben.";
  isLoading: boolean = false;
  compilerOutput: string | null = "";
  feedbackMessage: string =
    'Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben. Klicke hierzu auf den Button "Feedback erzeugen".';
  currentLoadingFeedbackMessage: string = "";
  lastResult: any;

  supportedLanguages = [
    { name: "Python", value: "python" },
    { name: "Java", value: "java" },
    { name: "TypeScript", value: "typescript" },
  ];


  constructor(
    private runCodeService: RunCodeService,
    private taskDataService: TaskDataService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
    private markdownService: MarkdownService,
    private dialog: MatDialog
  ) { }

  /**
   * Initialize the component by getting question data from the API.
   * The default week is set to the highest week number.
   */
  ngOnInit(): void {
    this.taskDataService.getTasks().subscribe(
      (tasks) => (
        (this.tasks = tasks),
        (this.defaultWeek = this.getHighestWeek()),
        this.changeWeek(this.defaultWeek)
      )
    );
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(
        target.getAttribute('href')
        );
    }
  }
  private openModal(href: string | null) {
    this.dialog.open(VideoTimeStampComponent, { data: { href } });
  }

  /**
   * Send student feedback to the API.
   */
  sendStudentFeedback(): void {
    this.currentState = States.sendStudentFeedback;
    this.runCodeService
      .postFeedback(this.rating, this.feedback, this.lastSubmissionId)
      .subscribe({
        next: (response) => {
          this.openSnackBar("Vielen Dank für Ihr Feedback!", "done");
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
      "Lass mich einen Augenblick über die Aufgabe nachdenken...";
    let submitCode = "";
    if (this.currentTask) {
      for (const file of this.currentTask.codingQuestion.codeGerueste) {
        submitCode +=
          "Beginn " +
          file.codeFileName +
          file.code +
          " Ende " +
          file.codeFileName +
          "`";
      }
    }

    let isFirstResponse = true;
    this.currentLoadingFeedbackMessage = "";
    this.runCodeService
      .getKiFeedback(submitCode, this.taskDescription, this.selectedLanguage, this.flavor, {
        resultjudge0: this.lastResult,
        encryptedSubmissionId: this.lastSubmissionId,
      })
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
          console.log(this.currentLoadingFeedbackMessage);
          this.currentState = States.finishedGeneratingKIFeedback;
        }
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
      for (const file of this.currentTask.codingQuestion.codeGerueste) {
        additionalFiles[file.codeFileName] = file.code;
      }
    }

    // Handling java tasks
    if (this.currentTask?.codingQuestion.programmingLanguage ==  "java") {
      // if Java run multiple file endpoint
      this.runCodeService
        .executeMultipleFiles(
          "", // async ng_bind in solution templates "{{}}" can trigger for data races, remove
          this.selectedLanguage,
          this.currentTaskId,
          inputArgs,
          additionalFiles
        )
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
    // Handling python tasks
    if (this.currentTask?.codingQuestion.programmingLanguage ==  "python") {
      // else run single file endpoint for python tasks, async ng_bind use in html. remove {{code}}
      const firstCodeStructure =
        this.currentTask?.codingQuestion.codeGerueste[0].code ||
        "error: no code found";
      this.runCodeService
        .executeCode(
          firstCodeStructure,
          this.selectedLanguage,
          this.currentTaskId
        )
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
  }

  /**
   * Handle the response from the API after submitting code.
   *
   * @param result - The API response data.
   */
  handleCodeSubmissionResponse(result: CodeSubmissionResultDto): void {
    const response: Judge0Dto = result.resultjudge0;
    this.lastSubmissionId = result.encryptedSubmissionId;
    this.lastResult = response;
    this.compilerOutput = response.stdout;
    if (response.compile_output) {
      this.compilerOutput += "\n" + response.compile_output;
    }
    if (response.stderr) {
      this.compilerOutput += "\n" + response.stderr;
    }
    this.isLoading = false;
    this.feedbackMessage =
      'Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben. Klicke hierzu auf den Button "Feedback erzeugen".';
    this.currentState = States.submittedCode;
  }

  /**
   * Download task files as a single .zip file or individual files.
   */
  downloadFiles(): void {
    if (!this.currentTask) {
      return;
    }

    if (this.currentTask.codingQuestion.codeGerueste.length === 1) {
      const codeGerueste = this.currentTask.codingQuestion.codeGerueste[0];
      const blob = new Blob([codeGerueste.code], {
        type: "text/plain;charset=utf-8",
      });
      saveAs(blob, codeGerueste.codeFileName);
    } else if (this.currentTask.codingQuestion.codeGerueste.length > 1) {
      const zip = new JSZip();
      for (const codeGerueste of this.currentTask.codingQuestion.codeGerueste) {
        zip.file(codeGerueste.codeFileName, codeGerueste.code);
      }
      zip.generateAsync({ type: "blob" }).then((blob) => {
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
    return this.inputArgsForm.get("argsArray") as FormArray;
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
      this.selectedLanguage = this.currentTask.codingQuestion.programmingLanguage;
      this.taskDescription = this.currentTask?.codingQuestion.textHTML;
    }

    // Add Input Args if there are any
    if (this.currentTask && this.currentTask.codingQuestion.countInputArgs !== undefined) {
      this.createInputArgs(this.currentTask.codingQuestion.countInputArgs);
    }
  }

    findQuestionById(id: number): QuestionDto | undefined {
    return this.tasks.find(question => question.id === id);
  }

  /**
   * Change the selected week.
   * @param index - The index of the week to change to.
   */
  changeWeek(index: number): void {
    this.selectedWeek = index;
    this.tasksOfSelectedWeek = this.tasks.filter((task) => task.week === index);
  }

  /**
   * Get the list of unique week numbers from tasks.
   */
  getWeeks(): number[] {
    const weeks = this.tasks.map((task) => task.week);
    const uniqueWeeks = [...new Set(weeks)];
    return uniqueWeeks.reverse();
  }

  /**
   * Get the highest week number from the tasks.
   */
  getHighestWeek(): number {
    const weeks = this.tasks.map((task) => task.week);
    const uniqueWeeks = [...new Set(weeks)];
    return Math.max(...uniqueWeeks);
  }

  /**
   * Show errors in console and as Snackback.
   */
  checkError(error: any): void {
    console.error(error);
    this.openSnackBar(
      "Ein Fehler ist aufgetreten. Bitte Konsole überprüfen.",
      "Warning"
    );
  }
  openSnackBar(message: string, icon: string): void {
    this.snackBar.open(message, "", {
      duration: 2500,
      panelClass: ["snackbar"],
      horizontalPosition: "center",
      verticalPosition: "bottom",
    });
  }
}
