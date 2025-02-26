import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ClassEdge, ClassNode, detailedQuestionDTO, editorDataDTO, editorElementDTO, EditorElement, EditorElementType, EditorModel, questionType, taskSettingsDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UmlEditorPopupComponent } from './uml-editor-popup/uml-editor-popup.component';
import { EditorComponent } from 'src/app/Modules/umlearn/pages/editor/editor.component';
import { EditorCommunicationService } from '@UMLearnServices/editor-communication.service';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-edit-uml',
  templateUrl: './edit-uml.component.html',
  styleUrls: ['./edit-uml.component.scss']
})
export class EditUmlComponent implements AfterViewInit {

  @ViewChild('question') questionField!: TinymceComponent;
  @ViewChild('umleditor') umlEditor!: EditorComponent;

  @ViewChild('alignContainer', { static: false }) alignContainer!: ElementRef;
  @ViewChild('leftContainer', { static: false }) leftContainer!: ElementRef;
  @ViewChild('rightContainer', { static: false }) rightContainer!: ElementRef;
  @ViewChild('resizer', { static: false }) resizer!: ElementRef;

  private isDragging = false;
  private startX = 0;
  private startLeftWidth = 0;
  protected isSaving = false;

  protected umlForm: FormGroup;
  protected selectedEditor = new FormControl('solution');
  protected selectedEditorAddText: string = 'Elemente zur Lösung hinzufügen';

  protected thisQuestionType = questionType.UML;
  protected detailedQuestionData: detailedQuestionDTO | null = null;
  protected currentEditorData: editorDataDTO = {
    nodes: [],
    edges: []
  }
  protected taskSettings: taskSettingsDTO = {
    allowedEdgeTypes: [],
    allowedNodeTypes: [],
    editorModel: EditorModel.CLASSDIAGRAM
  }
  protected possibleEdgeTypes: editorElementDTO[] = [];
  protected possibleNodeTypes: editorElementDTO[] = [];
  protected optionalNodeTypes: Set<EditorElement> = new Set();
  protected optionalEdgeTypes: Set<EditorElement> = new Set();

  protected editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 600,
    resize: false,
  }

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private editorCommunicationService: EditorCommunicationService
  ) {
    this.umlForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
    });
    this.editorCommunicationService.getEditorElements(EditorModel.CLASSDIAGRAM).subscribe(data => {
      this.possibleEdgeTypes = data.filter(e => e.elementType === EditorElementType.EDGE);
      this.possibleNodeTypes = data.filter(e => e.elementType === EditorElementType.NODE);
    });
  }

  ngOnInit(): void {
    //this.handleRouteParams();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
      this.setupResizer();
    }, 0);
  }

  /**
   * Sets up the resizer functionality for adjusting the width of two containers.
   * The resizer element is expected to be a child of the container element, and the left
   * and right containers are siblings within the container.
   *
   * The resizing is bounded to a minimum width of 15% and a maximum width of 85% for the left container.
   *
   * @private
   * @method setupResizer
   * @returns {void}
   */
  private setupResizer(): void {
    const container = this.alignContainer.nativeElement;
    const leftSide = this.leftContainer.nativeElement;
    const resizer = this.resizer.nativeElement;

    console.log(container, leftSide, resizer);
    if (!container || !leftSide || !resizer) return;

    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      this.startX = e.pageX;
      this.startLeftWidth = leftSide.offsetWidth;

      resizer.classList.add('dragging');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.pageX - this.startX;
      const newLeftWidth = ((this.startLeftWidth + deltaX) / container.offsetWidth) * 100;

      // Apply bounds (minimum 15%, maximum 85%)
      const boundedWidth = Math.min(Math.max(newLeftWidth, 15), 85);

      leftSide.style.width = `${boundedWidth}%`;
      const rightSide = this.rightContainer.nativeElement;
      if (rightSide) {
        rightSide.style.width = `${100 - boundedWidth}%`;
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
      resizer.classList.remove('dragging');
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
  }

  /**
   * Handles route parameters and fetches detailed question data based on the question ID.
   * Subscribes to route parameters and retrieves the question ID from the parameters.
   * Fetches detailed question data using the question ID and updates the component's state accordingly.
   * If the question type is UML, it processes the UML-specific data and updates the allowed node and edge types.
   * If the question type is not UML, it displays a warning message.
   *
   * @private
   * @returns {void}
   */
  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe((data: detailedQuestionDTO) => {
        if (data.type === questionType.UML) {
          this.detailedQuestionData = {
            ...data,
            umlQuestion: {
              ...data.umlQuestion,
              taskSettings: data.umlQuestion?.taskSettings || { allowedEdgeTypes: [], allowedNodeTypes: [], editorModel: EditorModel.CLASSDIAGRAM },
              editorData: data.umlQuestion?.editorData || { nodes: [], edges: [] },
              startData: data.umlQuestion?.startData || { nodes: [], edges: [] }
            }
          };

          this.optionalNodeTypes = new Set(this.detailedQuestionData.umlQuestion!.taskSettings!.allowedNodeTypes.filter(node => {
            return !this.detailedQuestionData!.umlQuestion!.editorData!.nodes.some(n => n.type === node.element)
          }).map(node => node.element));

          this.optionalEdgeTypes = new Set(this.detailedQuestionData.umlQuestion!.taskSettings!.allowedEdgeTypes.filter(edge => {
            return !this.detailedQuestionData!.umlQuestion!.editorData!.edges.some(e => e.type === edge.element)
          }).map(edge => edge.element));

          this.updateAllowedEdges();
          this.updateAllowedNodes();
          this.taskSettings = this.detailedQuestionData.umlQuestion!.taskSettings!;
          console.log('Task settings:', this.taskSettings);

          console.log(this.detailedQuestionData);
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine UML-Aufgabe!', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  /**
   * Sets the content of the UML form based on the detailed question data.
   *
   * @private
   */
  private setContent() {
    if (this.thisQuestionType === questionType.UML && this.detailedQuestionData) {
      this.umlForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.umlQuestion) {
        this.questionField.setContent(this.detailedQuestionData.umlQuestion.textHTML || this.detailedQuestionData.text);
        if (this.detailedQuestionData.umlQuestion.editorData) {
          console.log('Setting editor data:', this.detailedQuestionData.umlQuestion.editorData);
          this.currentEditorData = this.detailedQuestionData?.umlQuestion?.editorData;
        }
      }
    }
  }

  /**
   * Handles the overwrite action by showing a confirmation dialog to the user.
   * If the user accepts, it builds the data transfer object (DTO) and sends it to update the question.
   * Displays a success or error message based on the response.
   *
   * @protected
   * @method onOverwrite
   * @returns {void}
   */
  protected onOverwrite() {
    this.confirmationService.confirm({
      title: 'Frage aktualisieren',
      message: 'Dies überschreibt die aktuelle Version der Frage. Fortfahren?',
      acceptLabel: 'Aktualisieren',
      declineLabel: 'Abbrechen',
      accept: () => {
        this.isSaving = true;
        const submitData = this.buildDTO();
        console.log('about to send:', submitData);
        if (submitData) {
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

    this.confirmationService.confirm({
      title: 'Neue Version erstellen',
      message: 'Dies speichert die Frage unter einer neuen Version. Die alte Version bleibt erhalten, aber nicht mehr sichtbar. Fortfahren?',
      acceptLabel: 'Version erstellen',
      declineLabel: 'Abbrechen',
      accept: () => {
        //this.saveQuestion();
        console.log('Save accepted');
      },
      decline: () => {
        console.log('Save declined');
      }
    });
  }

  /**
   * Handles the cancel action by showing a confirmation dialog to the user.
   * If the user accepts, navigates to the dashboard and logs the action.
   * If the user declines, logs the action.
   *
   * @protected
   */
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

  /**
   * Builds a detailedQuestionDTO object based on the current form values and question data.
   *
   * @returns {detailedQuestionDTO | null} The constructed detailedQuestionDTO object if the form is valid and the question type is UML, otherwise null.
   *
   * The function performs the following steps:
   * 1. Checks if the question type is UML, the form is valid, and detailed question data is available.
   * 2. Constructs a new detailedQuestionDTO object by merging the existing detailed question data with the form values.
   * 3. Sets the UML question properties including id, questionId, textHTML, editorData, startData, and taskSettings.
   * 4. Returns the constructed detailedQuestionDTO object.
   * 5. Returns null if the conditions are not met.
   */
  private buildDTO(): detailedQuestionDTO | null {
    if (this.thisQuestionType === questionType.UML && this.umlForm.valid && this.detailedQuestionData) {
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.umlForm.value.questionTitle,
        level: parseInt(this.umlForm.value.questionDifficulty),
        description: this.umlForm.value.questionDescription,
        score: parseInt(this.umlForm.value.questionScore),
        text: this.questionField.getRawContent(),
        umlQuestion: {
          id: this.detailedQuestionData.umlQuestion?.id || undefined,
          questionId: this.detailedQuestionData.id,
          textHTML: this.questionField.getContent(),
          editorData: this.selectedEditor.value === 'solution' ? this.umlEditor.getSaveData() : this.detailedQuestionData.umlQuestion?.editorData,
          startData: this.selectedEditor.value === 'prefab' ? this.umlEditor.getSaveData() : this.detailedQuestionData.umlQuestion?.startData,
          //dataImage: null,
          taskSettings: this.detailedQuestionData.umlQuestion?.taskSettings || { allowedEdgeTypes: [], allowedNodeTypes: [], editorModel: EditorModel.CLASSDIAGRAM },
        }
      }
      return newData;
    }
    return null;
  }

  /**
   * Handles changes in the UML editor.
   *
   * This method is triggered whenever the user switches between 'solution' and 'prefab' mode.
   * Depending on the event type, it updates the `selectedEditorAddText` and
   * sets the `currentEditorData` to point to the appropriate data structure
   * (either `startData` or `editorData`) within `detailedQuestionData.umlQuestion`.
   *
   * @param event - The event object that triggered the change. It determines
   *                the type of change and updates the editor accordingly.
   */
  onEditorChange(event: any) {
    if (event && this.detailedQuestionData && this.detailedQuestionData.umlQuestion) {
      switch (event) {
        case 'prefab':
          this.selectedEditorAddText = 'Elemente zur Vorlage hinzufügen';
          if (!this.detailedQuestionData.umlQuestion.startData) {
            this.detailedQuestionData.umlQuestion.startData = { nodes: [], edges: [] };
          }
          // pointing to the start data
          this.currentEditorData = this.detailedQuestionData.umlQuestion.startData;
          break;
        case 'solution':
          this.selectedEditorAddText = 'Elemente zur Lösung hinzufügen';
          if (!this.detailedQuestionData.umlQuestion.editorData) {
            this.detailedQuestionData.umlQuestion.editorData = { nodes: [], edges: [] };
          }
          // pointing to the editor data
          this.currentEditorData = this.detailedQuestionData.umlQuestion.editorData;
          break;
      }
    }
  }

  /**
   * Checks if a specific node type is used within the editor data.
   *
   * @param type - The type of the editor element to check for.
   * @param settingsOnly - If true, only checks the optional node types. Defaults to false.
   * @returns A boolean indicating whether the specified node type is used.
   */
  protected isNodeTypeUsed(type: EditorElement, settingsOnly: boolean = false): boolean {
    return this.detailedQuestionData?.umlQuestion?.editorData?.nodes.some(node =>
      node.type === type) || // Direct match
      (!settingsOnly && this.optionalNodeTypes.has(type)); // Or optionally selected
  }

  /**
   * Checks if a specific edge type is used in the UML editor data.
   *
   * @param type - The type of the edge to check.
   * @param settingsOnly - If true, only checks if the type is in the optional edge types set. Defaults to false.
   * @returns `true` if the edge type is used, `false` otherwise.
   */
  protected isEdgeTypeUsed(type: EditorElement, settingsOnly: boolean = false): boolean {
    return this.detailedQuestionData?.umlQuestion?.editorData?.edges.some(edge =>
      edge.type === type) || // Direct match
      (!settingsOnly && this.optionalEdgeTypes.has(type)); // Or optionally selected
  }

  /**
   * Toggles the inclusion of a node type in the optional node types set based on the checkbox event.
   * If the checkbox is checked, the node type is added to the set; otherwise, it is removed.
   * After updating the set, the task settings are updated to reflect the changes.
   *
   * @param nodeType - The node type to be toggled, represented by an editorElementDTO object.
   * @param event - The checkbox change event containing the checked state.
   */
  protected onNodeTypeToggle(nodeType: editorElementDTO, event: MatCheckboxChange) {
    if (event.checked) {
      this.optionalNodeTypes.add(nodeType.element);
    } else {
      this.optionalNodeTypes.delete(nodeType.element);
    }
    // Update taskSettings to reflect changes
    this.updateAllowedNodes();
  }

  /**
   * Handles the toggle event for edge types in the editor.
   *
   * @param edgeType - The edge type being toggled.
   * @param event - The checkbox change event.
   *
   * When the checkbox is checked, the edge type is added to the set of optional edge types.
   * When the checkbox is unchecked, the edge type is removed from the set of optional edge types.
   *
   * After updating the set of optional edge types, the task settings are updated to reflect the changes.
   */
  protected onEdgeTypeToggle(edgeType: editorElementDTO, event: MatCheckboxChange) {
    if (event.checked) {
      this.optionalEdgeTypes.add(edgeType.element);
    } else {
      this.optionalEdgeTypes.delete(edgeType.element);
    }
    // Update taskSettings to reflect changes
    this.updateAllowedEdges();
  }

  /**
   * Handles changes to elements in the editor.
   *
   * This method is triggered when elements (either nodes or edges) are added or deleted.
   * If the selected editor is set to 'solution', it logs the changes and updates
   * the task settings with the current types by calling `updateAllowedNodes` and
   * `updateAllowedEdges`.
   *
   * @param event - The event object representing the changed element, which can be
   *                either a `ClassNode` or a `ClassEdge`.
   */
  protected onElementsChange(event: ClassNode | ClassEdge) {
    if (this.selectedEditor.value === 'solution') {
      console.log('Elements changed:', event);
      // Update taskSettings with current types
      this.updateAllowedNodes();
      this.updateAllowedEdges();
    }
  }

  /**
   * Updates the allowed node types for the UML question based on the current editor data and task settings.
   *
   * This method filters the possible node types and updates the `allowedNodeTypes` property of the `taskSettings`
   * object within `umlQuestion`. A node type is allowed if it is either already used in the editor data or is
   * optionally selected.
   *
   * If any of these checks fail, the method returns early without making any changes.
   */
  private updateAllowedNodes(){
    if (!(this.detailedQuestionData && this.detailedQuestionData.umlQuestion && this.detailedQuestionData.umlQuestion.editorData && this.detailedQuestionData.umlQuestion.taskSettings)) return;
    this.detailedQuestionData.umlQuestion.taskSettings.allowedNodeTypes = this.possibleNodeTypes.filter(node =>
      this.detailedQuestionData!.umlQuestion!.editorData!.nodes.some(n => n.type === node.element) || // If already used
      this.optionalNodeTypes.has(node.element) // Or optionally selected
    );
  }

  /**
   * Updates the allowed edge types for the UML question based on the current editor data and task settings.
   *
   * This method filters the possible edge types and updates the `allowedEdgeTypes` property of the `taskSettings`
   * object within `umlQuestion`. It ensures that only the edge types that are either already used in the editor
   * or optionally selected are allowed.
   *
   * If any of these checks fail, the method returns early without making any changes.
   */
  private updateAllowedEdges(){
    if (!(this.detailedQuestionData && this.detailedQuestionData.umlQuestion && this.detailedQuestionData.umlQuestion.editorData && this.detailedQuestionData.umlQuestion.taskSettings)) return;
    this.detailedQuestionData.umlQuestion.taskSettings.allowedEdgeTypes = this.possibleEdgeTypes.filter(edge =>
      this.detailedQuestionData!.umlQuestion!.editorData!.edges.some(e => e.type === edge.element) || // If already used
      this.optionalEdgeTypes.has(edge.element) // Or optionally selected
    );
  }

  /**
   * Copies the solution data to be used as a template.
   *
   * This method prompts the user with a confirmation dialog asking if they want to use the solution as a template.
   * If the user accepts, the current editor data is replaced with the solution data.
   *
   * @protected
   * @method copyFromSolution
   * @returns {void}
   */
  protected copyFromSolution(){
    this.confirmationService.confirm({
      title: 'Lösung kopieren',
      message: 'Möchten Sie die Lösung als Vorlage verwenden? Alle bisherigen Änderungen an der Vorlage gehen verloren.',
      acceptLabel: 'Verwenden',
      declineLabel: 'Abbrechen',
      accept: () => {
        if (this.detailedQuestionData && this.detailedQuestionData.umlQuestion && this.detailedQuestionData.umlQuestion.editorData) {
          this.detailedQuestionData.umlQuestion.startData = JSON.parse(JSON.stringify(this.detailedQuestionData.umlQuestion.editorData));
          if (this.detailedQuestionData.umlQuestion.startData) {
            this.currentEditorData = this.detailedQuestionData.umlQuestion.startData;
          }
        }
      },
      decline: () => {
        console.log('Copy declined');
      }
    });
  }

  /**
   * Copies the UML data from the prefab (template) to the current editor data.
   * This method shows a confirmation dialog to the user, asking if they want to use the template as the solution.
   * If the user accepts, the current editor data is replaced with the template data, and any previous changes are lost.
   *
   * @protected
   */
  protected copyFromPrefab(){
    this.confirmationService.confirm({
      title: 'Vorlage kopieren',
      message: 'Möchten Sie die Vorlage als Lösung verwenden? Alle bisherigen Änderungen an der Lösung gehen verloren.',
      acceptLabel: 'Verwenden',
      declineLabel: 'Abbrechen',
      accept: () => {
        if (this.detailedQuestionData && this.detailedQuestionData.umlQuestion && this.detailedQuestionData.umlQuestion.startData) {
          this.detailedQuestionData.umlQuestion.editorData = JSON.parse(JSON.stringify(this.detailedQuestionData.umlQuestion.startData));
          if (this.detailedQuestionData.umlQuestion.editorData) {
            this.currentEditorData = this.detailedQuestionData.umlQuestion.editorData;
          }
        }
      },
      decline: () => {
        console.log('Copy declined');
      }
    });
  }
}
