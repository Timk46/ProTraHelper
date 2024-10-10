import { Component, HostListener, SecurityContext, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BlankDTO, detailedFillinBlankDTO, detailedQuestionDTO, FillinQuestionType, questionType } from '@DTOs/index';
import { ConfirmationService } from 'src/app/Services/confirmation/confirmation.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadDialogComponent } from './image-upload-dialog/image-upload-dialog.component';
import { EditBlankComponent } from './edit-blank/edit-blank.component';

declare var tinymce: any;

@Component({
  selector: 'app-edit-fillin',
  templateUrl: './edit-fillin.component.html',
  styleUrls: ['./edit-fillin.component.scss']
})
export class EditFillinComponent {

  fillinForm: FormGroup;
  thisQuestionType = questionType.FILLIN;
  detailedQuestionData: detailedQuestionDTO | null = null;
  isSaving = false;
  fillinTypes = FillinQuestionType;

  /* fillin vars */

  //@ViewChild('fillinEditor') editorComponent!: TinymceComponent;
  editorInstance: any;
  editorConfig: any;
  FillinQuestionType = FillinQuestionType;

  /* questionDetails = {
    taskType: FillinQuestionype.Fillin,
    name: '',
    text: '',
    conceptName: '',
  }; */

  isEditorLoaded = false;
  generatedContent: SafeHtml | null = null;
  isExistingTask = false;
  buttonText = 'Aufgabe erstellen';

  private isMarkBlankModeActive = false;
  private isEditBlanksModeActive = false;
  private currentTaskId?: number;
  private blankInfo = new Map<string, { id: number, word: string | null }>();
  distractors: detailedFillinBlankDTO[] = [];
  distractorInput = '';
  isMarkDistractorModeActive = false;
  private currentPositionCounter: number = 0;

  /* ----------- */

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private route: ActivatedRoute,
    private confirmationService: ConfirmationService,
    private snackBar: MatSnackBar,
    private router: Router,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog

  ) {
    this.fillinForm = this.fb.group({
      questionTitle: ['', Validators.required],
      questionDifficulty: ['', Validators.required],
      questionDescription: [''],
      questionScore: ['', Validators.required],
      questionConcept: [''], // fals du concept ids brauchst, sonst egal

      fillinType: [FillinQuestionType.FillinText, Validators.required], // fillin types
      //fillinContent: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.handleRouteParams();
      //this.initializeEditor();
    }, 0);

  }

 /*  ngOnInit(): void {
    this.handleRouteParams();
    this.initializeEditorConfig();
    console.log('Initializing editor');
    this.initializeEditor();
  } */

  private handleRouteParams() {
    this.route.params.subscribe(params => {
      const questionId = parseInt(params['questionId']);
      this.questionDataService.getDetailedQuestionData(questionId, this.thisQuestionType).subscribe(data => {
        if (data.type === questionType.FILLIN) {
          this.detailedQuestionData = data;
          console.log(this.detailedQuestionData);
          this.initializeEditor();
          this.setContent();
        } else {
          this.snackBar.open('ACHTUNG: Bei den vorhandenen Daten handelt es sich nicht um eine Lückentextaufgabe', 'Schließen', { duration: 10000 });
          this.thisQuestionType = data.type as questionType;
        }
      });
    });
  }

  private setContent() {
    if (this.thisQuestionType === questionType.FILLIN && this.detailedQuestionData) {
      console.log('### Setting content:', this.detailedQuestionData.fillinQuestion?.content);
      this.fillinForm.patchValue({
        questionTitle: this.detailedQuestionData.name,
        questionDifficulty: this.detailedQuestionData.level.toString(),
        questionDescription: this.detailedQuestionData.description,
        questionScore: this.detailedQuestionData.score,
      });
      if (this.detailedQuestionData.fillinQuestion) { // fillinQuestion
        // TODO: restliche Felder fuellen
        this.fillinForm.patchValue({
          fillinType: this.detailedQuestionData.fillinQuestion.taskType,
        });
        //this.generatedContent = this.sanitizeContent(new DOMParser().parseFromString(this.detailedQuestionData.fillinQuestion.content, 'text/html'));
        if (this.editorInstance) {
          this.editorInstance.setContent(this.detailedQuestionData.fillinQuestion.content);
        }
        this.distractors = this.detailedQuestionData.fillinQuestion.blanks.filter(blank => blank.isDistractor);
      }
    }
  }

  private buildDTO(): detailedQuestionDTO | null {

    console.log(this.thisQuestionType === questionType.FILLIN, this.fillinForm.valid, this.detailedQuestionData)

    const doc = new DOMParser().parseFromString(this.editorInstance.getContent(), 'text/html');
    const distractors: detailedFillinBlankDTO[] = this.distractors;
    const blanks: detailedFillinBlankDTO[] = this.processBlanks(doc);

    if ( this.thisQuestionType === questionType.FILLIN && this.fillinForm.valid && this.detailedQuestionData && this.editorInstance.getContent().length > 0) {
      const newData: detailedQuestionDTO = {
        ...this.detailedQuestionData,
        name: this.fillinForm.value.questionTitle,
        level: parseInt(this.fillinForm.value.questionDifficulty),
        type: this.thisQuestionType,
        description: this.fillinForm.value.questionDescription,
        score: parseInt(this.fillinForm.value.questionScore),
        text: '', //this.questionField.getRawContent(),
        conceptNodeId: parseInt(this.fillinForm.value.questionConcept) || undefined,
        fillinQuestion: {
          id: this.detailedQuestionData.fillinQuestion?.id,
          content: this.editorInstance.getContent(),
          taskType: this.fillinForm.value.fillinType,
          table: false,
          blanks: [...blanks, ...distractors].map(blank => {
            return {
              blankContent: blank.blankContent || '<missingStr>',
              position: blank.position ? blank.position : -1,
              isDistractor: blank.isDistractor || false,
              isCorrect: blank.isCorrect || false,
              //isImage: blank.isImage,
              //imageUrl: blank.imageUrl
            }
          })
        }
      }
      return newData;
    }
    return null;
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
        console.log('Submit data:', submitData);
        if (submitData){
          this.questionDataService.updateWholeQuestion(submitData).subscribe({
            next: response => {
              console.log('Question updated successfully:', response);
              this.detailedQuestionData = response;
              this.setContent();
              this.snackBar.open('Frage erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
              this.isSaving = false;
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

  protected onCancel() {
    this.confirmationService.confirm({
      title: 'Bearbeitung abbrechen',
      message: 'Dies schließt die Bearbeitung der Frage. Alle ungespeicherten Daten gehen verloren. Fortfahren?',
      acceptLabel: 'Bearbeitung abbrechen',
      declineLabel: 'Weiter bearbeiten',
      swapColors: true,
      accept: () => {
        console.log('Cancel accepted');
        this.editorInstance.destroy();
        this.router.navigate(['dashboard']);
      },
      decline: () => {
        console.log('Cancel declined');
      }
    });
  }




  // ----------------- Freetext specific methods -----------------

  protected logContent(): void {
    console.log(this.editorInstance);
    if (this.editorInstance) {
      console.log('Curr content:', this.detailedQuestionData?.fillinQuestion?.content);
      console.log('Built DTO:', this.buildDTO());
    }
  }


  private initializeEditor(): void {
    if (typeof tinymce === 'undefined') {
      console.error('TinyMCE is not loaded. Make sure it is properly included in your project.');
      return;
    }

    if (!document.getElementById('fillinEditor')) {
      console.error('Element with id fillinEditor not found in the DOM.');
      return;
    }

    this.initializeEditorConfig();

    console.log('config:', this.editorConfig);
    tinymce.init({
      selector: '#fillinEditor',
      base_url: '/tinymce',
      suffix: '.min',
      menubar: false,
      statusbar: false,
      resize: false,
      branding: false,
      ...this.editorConfig
    });
  }

  /**
     * Initializes the configuration for the TinyMCE editor.
     * This includes setting up custom buttons, styles, and event listeners.
     */
  private initializeEditorConfig(): void {
    this.editorConfig = {
      plugins: 'link code table',
      toolbar: 'undo redo | code | formatselect | bold italic | table | insertImage | markBlank | editBlanks | addQuestionDetails | newTask',
      images_upload_url: 'linkToImages', // update to right path(!!!!)
      table_toolbar: '',
      table_cell_advtab: false,
      paste_data_images: true,
      automatic_uploads: false,
      file_picker_types: 'image',
      file_picker_callback: (callback: any, value: any, meta: any) => {
        if (meta.filetype === 'image') {
          this.openImageUploadDialog();
        }
      },
      table_row_advtab: false,
      table_advtab: false,
      content_style: `
        .text-blank, .table-blank {
          opacity: 0.5 !important;
          background-color: transparent !important;
        }
        .tox .tox-tbtn {
          transition: all 0.1s ease;
        }
        .tox .tox-tbtn--enabled,
        .tox .tox-tbtn:active {
          background-color: #e6e6e6 !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
          transform: translateY(1px);
        }
      `,
      setup: (editor: any) => {
        this.setupEditorButtons(editor);
        this.setupEditorEventListeners(editor);
        editor.on('init', () => {
          this.isEditorLoaded = true;
          editor.setContent(this.detailedQuestionData?.fillinQuestion?.content || 'nix drin');
          this.applyStyles(editor);
        });
        editor.on('keydown', (e: KeyboardEvent) => this.handleEditorKeydown(editor, e));
        this.editorInstance = editor;
      },
      extended_valid_elements: 'span[class|style|data-word|title],div[class|contenteditable]'
    };
  }

  /**
  * Sets up custom buttons for the TinyMCE editor toolbar.
  * @param editor - The TinyMCE editor instance
  */
  private setupEditorButtons(editor: any): void {
    const buttons = [
      {
        name: 'markBlank',
        text: 'Lücke markieren',
        action: () => this.toggleMarkBlankMode(editor),
        onSetup: (api: any) => {
          api.setActive(this.isMarkBlankModeActive);
          return editor.on('markBlankModeChanged', (e: any) => api.setActive(e.active));
        }
      },
      /* {
        name: 'editBlanks',
        text: 'Lücken bearbeiten',
        action: () => this.toggleEditBlanksMode(editor),
        onSetup: (api: any) => {
          const updateButtonState = (e: any) => {
            api.setEnabled(e.isExistingTask);
            api.setActive(this.isEditBlanksModeActive);
          };
          editor.on('EditBlanksStateChanged', updateButtonState);
          updateButtonState({ isExistingTask: this.isExistingTask });
          return () => editor.off('EditBlanksStateChanged', updateButtonState);
        }
      }, */
      {
        name: 'markDistractor',
        text: 'Mark Distractor',
        action: () => this.toggleMarkDistractorMode(editor),
        onSetup: (api: any) => {
          api.setActive(this.isMarkDistractorModeActive);
          return editor.on('markDistractorModeChanged', (e: any) => api.setActive(e.active));
        }
      },
      //{ name: 'addQuestionDetails', text: 'Fragendetails hinzufügen', action: () => this.openQuestionDetailsDialog() },
      //{ name: 'newTask', text: 'Neue Aufgabe erstellen', action: () => this.createNewTask(editor) },
      { name: 'insertImage', text: 'Bild einfügen', action: () => this.openImageUploadDialog() }

    ];

    buttons.forEach(button => {
      editor.ui.registry.addToggleButton(button.name, {
        text: button.text,
        onAction: button.action,
        onSetup: button.onSetup
      });
    });
  }

  /**
   * Opens the image upload dialog
   */
  openImageUploadDialog(): void {
    const dialogRef = this.dialog.open(ImageUploadDialogComponent, {
      width: '600px',
      height: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle the uploaded image
        console.log('Uploaded file:', result);
        this.insertImageIntoEditor(result);
      }
    });
  }

  /**
   * Inserts the uploaded image into the editor
   * @param imageData The uploaded image data
   */
  private insertImageIntoEditor(imageData: any): void {
    if (this.editorInstance) {
      const editor = this.editorInstance;
      const imageHtml = `<img src="${imageData.url}" alt="${imageData.altDescription}" width="${imageData.width}" height="${imageData.height}">`;
      editor.insertContent(imageHtml);
    }
  }


  /**
   * Sets up event listeners for the TinyMCE editor.
   * @param editor - The TinyMCE editor instance
   */
  private setupEditorEventListeners(editor: any): void {
    editor.on('SelectionChange', () => {
      this.updateMarkBlankButtonState(editor);
    });

    editor.on('click', (e: any) => {
      if (this.isMarkBlankModeActive) this.handleMarkBlankClick(editor, e);
      if (this.isEditBlanksModeActive) this.handleEditBlankClick(editor, e);
      if (this.isMarkDistractorModeActive) this.handleMarkDistractorClick(editor, e);
    });

    editor.on('mousedown', (e: any) => {
      if (this.isMarkBlankModeActive && e.target.nodeName === 'IMG') {
        e.preventDefault();
      }
    });

    editor.on('ImageBlankToggled', (e: any) => {
      const { img, isBlank } = e;
      if (isBlank) {
        this.addImageBlank(img, img.src);
      } else {
        this.removeImageBlank(img);
      }
    });
  }
  /**
   * Adds an image blank to the blankInfo map.
   * @param {HTMLImageElement} img - The image element
   */
  private addImageBlank(img: HTMLImageElement, imageSource: string): void {
    const position = this.currentPositionCounter.toString();
    this.currentPositionCounter++;
    console.log('position', position);
    const id = -1; // Temporary ID, will be updated when saved
    this.blankInfo.set(position, { id, word: imageSource });
    console.log('blankInfo', this.blankInfo);
    img.setAttribute('data-position', position);
  }

  /**
   * Removes an image blank from the blankInfo map.
   * @param {HTMLImageElement} img - The image element
   */
  private removeImageBlank(img: HTMLImageElement): void {
    const position = img.getAttribute('data-position');
    if (position) {
      this.blankInfo.delete(position);
      img.removeAttribute('data-position');
    }
  }

  /**
   * Applies custom styles to the editor content.
   * @param editor - The TinyMCE editor instance
   */
  private applyStyles(editor: any): void {
    editor.dom.addStyle(`
      .generated-blank {
        opacity: 0.5;
      }
      .generated-blank.editable-blank {
        opacity: 1;
        border: 2px dashed #007bff !important;
        cursor: pointer;
        padding: 2px;
      }
    `);
  }

  /**
   * Sanitizes the HTML content of the editor.
   * @param {Document} doc - The Document object containing the editor content
   * @returns {SafeHtml} The sanitized HTML string
   */
  private sanitizeContent(doc: Document): SafeHtml {
    // TODO: Implement proper HTML sanitization
    return this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
  }

  /**
   * Handles clicks when in mark blank mode.
   * @param {any} editor - The TinyMCE editor instance
   * @param {MouseEvent} e - The click event
   */
  private handleMarkBlankClick(editor: any, e: MouseEvent): void {
    const clickedElement = editor.dom.getParent(e.target, 'td, img') || e.target;
    if (clickedElement.nodeName === 'TD') {
      this.toggleTableCellBlank(editor, clickedElement);
    } else if (clickedElement.nodeName === 'IMG') {
      e.preventDefault();
      this.toggleImageBlank(editor, clickedElement);
    } else {
      this.toggleTextBlank(editor, clickedElement);
    }
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Handles keydown events in the editor to prevent typing inside blanks.
   * @param editor - The TinyMCE editor instance
   * @param e - The keydown event
   */
  private handleEditorKeydown(editor: any, e: KeyboardEvent): void {
    const selection = editor.selection;
    const range = selection.getRng();
    const startContainer = range.startContainer;

    // Check if the cursor is inside or at the edge of a blank
    if (this.isInsideOrEdgeOfBlank(startContainer)) {
      // Allow selection with arrow keys, but prevent typing
      if (!this.isNavigationKey(e.key)) {
        e.preventDefault();
        // Move cursor to the end of the blank
        this.moveCursorAfterBlank(editor, startContainer);
      }
    }
  }

  /**
   * Checks if the given node is inside or at the edge of a blank.
   * @param node - The DOM node to check
   * @returns True if the node is inside or at the edge of a blank, false otherwise
   */
  private isInsideOrEdgeOfBlank(node: Node): boolean {
    let currentNode: Node | null = node;
    while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
      currentNode = currentNode.parentNode;
    }
    return currentNode?.nodeName === 'SPAN' &&
          (currentNode as Element).classList.contains('generated-blank');
  }

  /**
   * Checks if the given key is a navigation key.
   * @param key - The key to check
   * @returns True if the key is a navigation key, false otherwise
   */
  private isNavigationKey(key: string): boolean {
    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    return navigationKeys.includes(key);
  }

  /**
   * Moves the cursor after the blank containing the given node.
   * @param editor - The TinyMCE editor instance
   * @param node - The node currently containing the cursor
   */
  private moveCursorAfterBlank(editor: any, node: Node): void {
    let blankSpan = node;
    while (blankSpan && blankSpan.nodeType !== Node.ELEMENT_NODE) {
      blankSpan = blankSpan.parentNode as Node;
    }

    if (blankSpan && (blankSpan as Element).classList.contains('generated-blank')) {
      const range = editor.dom.createRng();
      range.setStartAfter(blankSpan);
      range.collapse(true);
      editor.selection.setRng(range);
    }
  }


  /**
   * Handles clicks when in edit blanks mode.
   * @param {any} editor - The TinyMCE editor instance
   * @param {MouseEvent} e - The click event
   */
  private handleEditBlankClick(editor: any, e: MouseEvent): void {
    const clickedElement = editor.dom.getParent(e.target, '.generated-blank');
    if (clickedElement && this.isEditBlanksModeActive) {
      this.openEditBlankDialog(clickedElement);
    }
  }

  /**
   * Handles clicks when in mark distractor mode
   * @param {any} editor - The TinyMCE editor instance
   * @param {MouseEvent} e - The click event
   */
  private handleMarkDistractorClick(editor: any, e: MouseEvent): void {
    const clickedElement = e.target as HTMLElement;
    this.toggleDistractor(editor, clickedElement);
    e.preventDefault();
  }

  /**
   * Handles clicks on the generated content when in edit blanks mode.
   * @param {MouseEvent} event - The click event
   */
  handleGeneratedContentClick(event: MouseEvent): void {
    if (this.isEditBlanksModeActive) {
      const clickedElement = (event.target as Element).closest('.generated-blank, .editable-generated-blank, .distractor, .editable-distractor') as HTMLElement;
      if (clickedElement) {
        if (clickedElement.classList.contains('distractor') || clickedElement.classList.contains('editable-distractor')) {
          this.openEditDistractorDialog(clickedElement);
        } else {
          this.openEditBlankDialog(clickedElement);
        }
      }
    }
  }

  /**
   * Opens a dialog to edit a distractor.
   * @param {HTMLElement} element - The HTML element representing the distractor
   */
  private openEditDistractorDialog(element: HTMLElement): void {
    const distractorId = element.getAttribute('data-distractor-id');
    if (!distractorId) {
      console.error('Invalid distractor ID');
      return;
    }

    const index = parseInt(distractorId);
    const distractor = this.distractors[index];
    if (!distractor) {
      console.error('Distractor not found');
      return;
    }

    const dialogRef = this.dialog.open(EditBlankComponent, {
      width: '250px',
      data: { word: distractor.blankContent, isDistractor: true }
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        this.updateDistractor(index, result);
      }
    });
  }

  /**
   * Opens a dialog to edit a blank.
   * @param {HTMLElement} element - The HTML element representing the blank
   */
  private openEditBlankDialog(element: HTMLElement): void {
    let position = element.getAttribute('data-position');
    const isImage = element.tagName.toLowerCase() === 'img';
    const isInEditor = this.editorInstance?.getBody().contains(element);

    if (!position) {
      const htmlContent = this.sanitizer.sanitize(SecurityContext.HTML, this.generatedContent) || '';
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      const allBlanks = doc.querySelectorAll('.generated-blank, .editable-generated-blank');
      position = Array.from(allBlanks).findIndex(blank => blank.isEqualNode(element)).toString();
    }

    if (!position || !this.blankInfo.has(position)) {
      console.error('Invalid blank position');
      return;
    }

    const { word } = this.blankInfo.get(position)!;
    const dialogRef = this.dialog.open(EditBlankComponent, {
      width: isImage ? '500px' : '250px',
      height: isImage ? '500px' : '250px',
      data: {word: isImage ? (element as HTMLImageElement).src : word, isDistractor: false, isImage: isImage}
    });

    dialogRef.afterClosed().subscribe((result: string | File) => {
      if (result) {
        console.log('Updating blank:', position, result);
        this.updateBlank(element, result);
        this.updateGeneratedContent();
        if (isImage) {
          this.updateBlankWithNewImage(element, position!, this.blankInfo.get(position!)!.id, result instanceof File ? URL.createObjectURL(result) : result);
          this.updateEditorImageContent(position!, result);
        }
      }
    });
  }

  private updateEditorImageContent(position: string, newImage: string | File): void {
    if (this.editorInstance) {
      const editor = this.editorInstance;
      const editorBody = editor.getBody();
      const imageInEditor = editorBody.querySelector(`[data-position="${position}"]`) as HTMLImageElement;

      if (imageInEditor) {
        if (newImage instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageData = e.target?.result as string;
            imageInEditor.src = imageData;
            editor.fire('change');
          };
          reader.readAsDataURL(newImage);
        } else {
          imageInEditor.src = newImage;
          editor.fire('change');
        }
      }
    }
  }

  /**
   * Toggles a table cell as a blank.
   * @param {any} editor - The TinyMCE editor instance
   * @param {HTMLElement} cell - The table cell element
   */
  private toggleTableCellBlank(editor: any, cell: HTMLElement): void {
    const isBlank = cell.classList.contains('table-blank');
    cell.classList.toggle('table-blank', !isBlank);
    const word = cell.textContent || '';
    cell.setAttribute('data-word', isBlank ? '' : word);

  }

  /**
   * Toggles an image as a blank.
   * @param {any} editor - The TinyMCE editor instance
   * @param {HTMLImageElement} img - The image element
   */
  private toggleImageBlank(editor: any, img: HTMLImageElement): void {
    const isBlank = img.classList.contains('image-blank');
    img.classList.toggle('image-blank', !isBlank);
    img.classList.toggle('generated-blank', !isBlank);
    const imageSource = img.src;
    editor.fire('ImageBlankToggled', { img, isBlank: !isBlank, imageSource });

    if (!isBlank) {
      // Adding a new image blank
      const position = this.blankInfo.size.toString();
      img.setAttribute('data-position', position);
      this.blankInfo.set(position, { id: -1, word: img.src });
    } else {
      // Removing an existing image blank
      const position = img.getAttribute('data-position');
      if (position) {
        this.blankInfo.delete(position);
        img.removeAttribute('data-position');
      }
  }

    editor.fire('ImageBlankToggled', { img, isBlank: !isBlank, imageSource: img.src });
  }

  /**
   * Toggles a text selection as a blank.
   * @param editor - The TinyMCE editor instance
   * @param element - The element containing the text selection
   */
  private toggleTextBlank(editor: any, element: HTMLElement): void {
    if (element.nodeName === 'SPAN' && element.classList.contains('text-blank')) {
      editor.dom.remove(element, true);
    } else {
      const range = editor.selection.getRng();
      const startNode = range.startContainer;
      if (startNode.nodeType === Node.TEXT_NODE) {
        const wordRange = this.getWordRange(editor, startNode, range.startOffset);
        if (wordRange) {
          const word = wordRange.toString();
          const existingBlank = editor.dom.getParent(startNode, '.generated-blank');
          if (existingBlank) {
            // Update existing blank instead of creating a new one
            existingBlank.setAttribute('data-word', word);
            existingBlank.textContent = word;
          } else {
            const span = editor.dom.create('span', {
              class: 'generated-blank',
              'data-word': word,
            });
            wordRange.surroundContents(span);

            // Assign a unique position
            const position = this.currentPositionCounter.toString();
            this.currentPositionCounter++;
            span.setAttribute('data-position', position);
            this.blankInfo.set(position, { id: -1, word });

            // Set the cursor after the span
            const newRange = editor.dom.createRng();
            newRange.setStartAfter(span);
            newRange.collapse(true);
            editor.selection.setRng(newRange);

            console.log('Added text blank:', position, word);
            console.log('Current blankInfo map:', this.blankInfo);
          }
        }
      }
    }
  }


  /**
   * Toggles a word as a distractor
   * @param {any} editor - The TinyMCE editor instance
   * @param {HTMLElement} element - The element to toggle as a distractor
   */
  private toggleDistractor(editor: any, element: HTMLElement): void {
    if (element.classList.contains('distractor')) {
      editor.dom.remove(element, true);
    } else {
      const range = editor.selection.getRng();
      const startNode = range.startContainer;
      if (startNode.nodeType === Node.TEXT_NODE) {
        const wordRange = this.getWordRange(editor, startNode, range.startOffset);
        if (wordRange) {
          const word = wordRange.toString();
          const span = editor.dom.create('span', {
            class: 'editable-distractor',
            'data-word': word
          });
          wordRange.surroundContents(span);
        }
      }
    }
  }


  /**
   * Adds a global distractor
   * @param {string} word - The distractor word to add
   */
  addGlobalDistractor(word: string): void {
    if (word && !this.distractors.some(d => d.blankContent === word)) {
      this.distractors.push({
        blankContent: word,
        position: -1,  // Use -1 to indicate it's a global distractor
        isDistractor: true,
        isCorrect: false
      });
      this.distractorInput = '';
    }
  }

  /**
   * Removes a global distractor
   * @param {BlankDTO} distractor - The distractor to remove
   */
  removeGlobalDistractor(distractor: detailedFillinBlankDTO): void {
    const index = this.distractors.findIndex(d => d.blankContent === distractor.blankContent);
    if (index > -1) {
      this.distractors.splice(index, 1);
    }
  }

  /**
   * Creates a blank from the current text selection in the editor.
   * @param editor - The TinyMCE editor instance
   */
  private createBlankFromSelection(editor: any): void {
    const selection = editor.selection;
    const range = selection.getRng();

    if (!range.collapsed) {
      const content = range.extractContents();
      const blankSpan = editor.dom.create('span', {
        'class': 'generated-blank',
        'data-word': content.textContent.trim(),
        contenteditable: 'false'
      });
      blankSpan.appendChild(content);
      range.insertNode(blankSpan);
      //selection.select(blankSpan);

      // Move the cursor after the newly created blank
      const newRange = editor.dom.createRng();
      newRange.setStartAfter(blankSpan);
      newRange.collapse(true);
      selection.setRng(newRange);

      this.updateBlankInfo(blankSpan);
      this.isMarkBlankModeActive = false;
      this.updateEditorMode(editor);
    } else {
      editor.notificationManager.open({
        text: 'Bitte nun ein Wort, eine Tabellenzelle oder ein Bild auswählen, um eine Lücke zu markieren.',
        type: 'warning',
        timeout: 4000
      });
    }
  }

  /**
   * Updates the state of the "Lücke markieren" button based on the current selection.
   * @param editor - The TinyMCE editor instance
   */
  private updateMarkBlankButtonState(editor: any): void {
    const hasSelection = !editor.selection.isCollapsed();
    const markBlankButton = editor.ui.registry.getAll().buttons.markBlank;

    if (markBlankButton) {
      markBlankButton.setEnabled(hasSelection);
    }
  }

  /**
   * Updates the blankInfo map with the new blank's information.
   * @param blankSpan - The span element representing the new blank
   */
  private updateBlankInfo(blankSpan: HTMLElement): void {
    const position = this.blankInfo.size.toString();
    const word = blankSpan.getAttribute('data-word') || '';
    this.blankInfo.set(position, { id: -1, word });
    blankSpan.setAttribute('data-position', position);
  }

  /**
   * Toggles the mark blank mode.
   * @param editor - The TinyMCE editor instance
   */
  private toggleMarkBlankMode(editor: any): void {
    this.isMarkBlankModeActive = !this.isMarkBlankModeActive;
    this.isEditBlanksModeActive = false;
    this.updateEditorMode(editor);

    if (this.isMarkBlankModeActive) {
      const selection = editor.selection;
      const range = selection.getRng();

      if (!range.collapsed) {
        // If there's a text selection, create a blank from it
        this.createBlankFromSelection(editor);
      } else {
        // If there's no selection, show a message to guide the user
        editor.notificationManager.open({
          text: 'Bitte nun ein Wort, eine Tabellenzelle oder ein Bild auswählen, um eine Lücke zu markieren.',
          type: 'info',
          timeout: 3000
        });
      }
    }

    editor.fire('markBlankModeChanged', { active: this.isMarkBlankModeActive });
  }

  /**
   * Toggles the edit blanks mode.
   * @param editor - The TinyMCE editor instance
   */
  private toggleEditBlanksMode(editor: any): void {
    this.isEditBlanksModeActive = !this.isEditBlanksModeActive;
    this.isMarkBlankModeActive = false;
    this.updateEditorMode(editor);
    this.updateGeneratedContentStyles();
    this.updateGeneratedContent();
    editor.fire('EditBlanksStateChanged', {
      active: this.isEditBlanksModeActive,
      isExistingTask: this.isExistingTask
    });
  }

  /**
   * Toggles the mark distractor mode
   * @param editor - The TinyMCE editor instance
   */
  private toggleMarkDistractorMode(editor: any): void {
    this.isMarkDistractorModeActive = !this.isMarkDistractorModeActive;
    this.isMarkBlankModeActive = false;
    this.isEditBlanksModeActive = false;
    this.updateEditorMode(editor);
    editor.fire('markDistractorModeChanged', { active: this.isMarkDistractorModeActive });
  }

  /**
   * Updates the editor mode based on the active modes.
   * @param editor - The TinyMCE editor instance
   */
  private updateEditorMode(editor: any): void {
    editor.getBody().style.cursor = this.isMarkBlankModeActive ? 'crosshair' :
                                    this.isMarkDistractorModeActive ? 'cell' : 'default';

    // Clean up unnecessary spans and empty paragraphs
    const body = editor.getBody();
    this.cleanupEditorContent(body);

    editor.fire('markBlankModeChanged', { active: this.isMarkBlankModeActive });
    editor.fire('editBlanksModeChanged', { active: this.isEditBlanksModeActive });
    editor.fire('markDistractorModeChanged', { active: this.isMarkDistractorModeActive });
    this.updateBlankStyles(editor);
    this.updateDistractorStyles(editor);
    this.updateGeneratedContentStyles();
  }

  /**
   * Cleans up the editor content by removing unnecessary spans and empty paragraphs.
   * @param {HTMLElement} element  - The HTML element to clean up
   */
  private cleanupEditorContent(element: HTMLElement): void {
    /*const blanks = element.querySelectorAll('.generated-blank');
    blanks.forEach(blank => {
      if (!blank.classList.contains('image-blank')) {
        const nextSibling = blank.nextSibling;
        if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE &&
            (nextSibling as HTMLElement).classList.contains('generated-blank')) {
          nextSibling.remove();
        }
      }
    });*/

    const paragraphs = element.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (p.innerHTML.trim() === '' || p.innerHTML === '&nbsp;') {
        p.remove();
      }
    });
  }

  /**
   * Updates a distractor with a new word.
   * @param {number} index - The index of the distractor to update
   * @param {string} newWord - The new word for the distractor
   */
  private updateDistractor(index: number, newWord: string): void {
    if (index < 0 || index >= this.distractors.length) {
      console.error('Invalid distractor index');
      return;
    }

    this.distractors[index].blankContent = newWord;

    if (this.generatedContent) {
      const htmlContent = this.sanitizer.sanitize(SecurityContext.HTML, this.generatedContent) || '';
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      const distractorElements = doc.querySelectorAll('.distractor, .editable-distractor');

      if (index < distractorElements.length) {
        const distractorElement = distractorElements[index] as HTMLElement;
        distractorElement.textContent = newWord;
        distractorElement.setAttribute('data-word', newWord);
      }

      this.generatedContent = this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
    }

    this.updateGeneratedContent();
  }

  /**
   * Updates the styles of the generated content based on the active mode.
   */
  private updateGeneratedContentStyles(): void {
    if (this.generatedContent) {
      const htmlContent = this.sanitizer.sanitize(SecurityContext.HTML, this.generatedContent) || '';
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      doc.querySelectorAll('.generated-blank').forEach((blank: Element) => {
        blank.classList.toggle('editable-generated-blank', this.isEditBlanksModeActive);
      });
      doc.querySelectorAll('.distractor').forEach((distractor: Element) => {
        distractor.classList.toggle('editable-distractor', this.isEditBlanksModeActive);
      });
      this.generatedContent = this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
    }
  }

  /**
   * Updates the styles of distractors in the editor
   * @param editor - The TinyMCE editor instance
   */
  private updateDistractorStyles(editor: any): void {
    editor.getBody().querySelectorAll('.distractor').forEach((distractor: any) => {
      distractor.classList.toggle('editable-distractor', this.isMarkDistractorModeActive);
    });
  }

  /**
   * Updates the styles of blanks in the editor based on the active mode.
   * @param editor - The TinyMCE editor instance
   */
  private updateBlankStyles(editor: any): void {
    const body = editor.getBody();
    const blanks = body.querySelectorAll('.generated-blank, img.image-blank');

    blanks.forEach((blank: HTMLElement) => {
      const isImage = blank.tagName.toLowerCase() === 'img';
      const word = isImage ? blank.getAttribute('src') : blank.getAttribute('data-word');

      if (isImage) {
        blank.classList.add('image-blank');
      }

      // Toggle editable classes based on the edit mode
      blank.classList.toggle('editable-blank', this.isEditBlanksModeActive);
      blank.classList.toggle('editable-generated-blank', this.isEditBlanksModeActive);
    });
  }

  private updateEditorButtonStates(): void {
    if (this.editorInstance) {
      const editor = this.editorInstance;
      editor.fire('EditBlanksStateChanged', { isExistingTask: this.isExistingTask });
    }
  }

  /**
   * Updates a blank with a new word.
   * @param {HTMLElement} blankElement - The HTML element representing the blank
   * @param {string} newWord - The new word for the blank
   */
  private updateBlank(blankElement: HTMLElement, newWord: string | File): void {
    const position = blankElement.getAttribute('data-position');
    if (!position || !this.blankInfo.has(position)) {
      console.error('Invalid blank position');
      return;
    }
    console.log("newWord: ", newWord)
    const { id } = this.blankInfo.get(position)!;
    const isImage = blankElement.tagName.toLowerCase() === 'img';

    if (isImage && newWord instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        this.updateBlankWithNewImage(blankElement, position, id, imageData);
        this.updateGeneratedContent();
      };
      reader.readAsDataURL(newWord);
    } else if (typeof newWord === 'string') {
      this.updateBlankWithNewWord(blankElement, position, id, newWord);
      this.updateGeneratedContent();
    } else {
      console.error('Invalid newValue type');
    }
  }

  private updateBlankWithNewImage(blankElement: HTMLElement, position: string, id: number, imageData: string): void {
    /* (blankElement as HTMLImageElement).src = imageData;

    const updateBlankDto: BlankDTO = {
      id,
      fillinQuestionId: this.currentTaskId!,
      position,
      word: imageData,
      isDistractor: false
    };

    this.fillinQuestionService.updateBlank(updateBlankDto).subscribe(
      updatedBlank => {
        console.log('Image blank updated successfully', updatedBlank);
        this.blankInfo.set(position, { id, word: imageData });
        this.updateBlankElements();
        this.updateGeneratedContent();
        this.updateEditorImageContent(position, imageData);
      }
    ); */
  }

  private updateBlankWithNewWord(blankElement: HTMLElement, position: string, id: number, newWord: string): void {
    /* const updateBlankDto: BlankDTO = {
      id,
      fillinQuestionId: this.currentTaskId!,
      position,
      word: newWord,
      isDistractor: false
    };

    this.fillinQuestionService.updateBlank(updateBlankDto).subscribe(
      updatedBlank => {
        console.log('Text blank updated successfully', updatedBlank);
        this.blankInfo.set(position, { id, word: newWord });
        this.updateBlankElements();
        this.updateGeneratedContent();
        this.updateEditorContent();
      }
    ); */
  }

  /**
   * updates the text content of the editor with the updated content
   */
  private updateEditorContent(): void {
    if (this.editorInstance) {
      const editor = this.editorInstance;
      const content = editor.getContent();
      const doc = new DOMParser().parseFromString(content, 'text/html');

      doc.querySelectorAll('.generated-blank').forEach((blank: Element) => {
        const position = blank.getAttribute('data-position');
        if (position && this.blankInfo.has(position)) {
          const { word } = this.blankInfo.get(position)!;
          blank.setAttribute('data-word', word || '');
          blank.textContent = word;
        }
      });
      editor.setContent(doc.body.innerHTML);
    }
  }

  /**
   * Handles the keyup event for the distractor input field.
   * Adds a new distractor when the Enter key is pressed.
   * @param event The KeyboardEvent
   */
  onDistractorKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addGlobalDistractor(this.distractorInput);
    }
  }

  /**
   * Updates the generated content with the new content
   */
  private updateGeneratedContent(): void {
    if (!this.generatedContent) return;

    const htmlContent = this.sanitizer.sanitize(SecurityContext.HTML, this.generatedContent) || '';
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

    // Process blanks
    const blanks = Array.from(doc.querySelectorAll('.generated-blank, .editable-generated-blank, img.image-blank'));
    blanks.forEach((blank, index) => {
      const position = blank.getAttribute('data-position') || index.toString();
      if (this.blankInfo.has(position)) {
        const { id, word } = this.blankInfo.get(position)!;
        blank.setAttribute('data-blank-id', id.toString());
        blank.setAttribute('data-word', word || '');
        blank.setAttribute('data-position', position);
        if (blank.tagName.toLowerCase() === 'img') {
          (blank as HTMLImageElement).src = word || '';
          blank.className = 'generated-blank image-blank';
          if (this.isEditBlanksModeActive) {
            blank.classList.add('editable-generated-blank');
          }
        } else {
          blank.textContent = '______';
          blank.className = 'generated-blank';
          if (this.isEditBlanksModeActive) {
            blank.classList.add('editable-generated-blank');
          }
        }
      } else {
        console.warn(`No blank info found for position: ${position}`);
      }
    });

    // Process existing distractors
    const existingDistractors = Array.from(doc.querySelectorAll('.distractor, .editable-distractor'));
    existingDistractors.forEach((distractor, index) => {
      distractor.className = this.isEditBlanksModeActive ? 'distractor editable-distractor' : 'distractor';
      distractor.setAttribute('data-distractor-id', index.toString());
    });

    // Add new distractors only if they don't already exist
    const existingDistractorWords = new Set(existingDistractors.map(d => d.textContent));
    this.distractors.forEach((distractor, index) => {
      if (!existingDistractorWords.has(distractor.blankContent)) {
        const distractorElement = doc.createElement('span');
        distractorElement.className = this.isEditBlanksModeActive ? 'distractor editable-distractor' : 'distractor';
        distractorElement.setAttribute('data-distractor-id', (existingDistractors.length + index).toString());
        distractorElement.setAttribute('data-word', distractor.blankContent!);
        distractorElement.textContent = distractor.blankContent;
        doc.body.appendChild(document.createTextNode(' ')); // Add space before distractor
        doc.body.appendChild(distractorElement);
      }
    });

    // Ensure table structure is preserved
    doc.querySelectorAll('table').forEach(table => {
      (table as HTMLElement).setAttribute('border', '1');
      (table as HTMLElement).style.borderCollapse = 'collapse';
      (table as HTMLElement).style.width = '100%';
    });

    doc.querySelectorAll('td, th').forEach(cell => {
      (cell as HTMLElement).style.border = '1px solid #000';
      (cell as HTMLElement).style.padding = '8px';
    });

    this.applyEditableStyles(doc);

    const updatedContent = this.replaceBlankPlaceholders(doc.body.innerHTML);
    this.generatedContent = this.sanitizer.bypassSecurityTrustHtml(updatedContent);
    console.log('Updated generated content:', this.generatedContent);
  }

  private applyEditableStyles(doc: Document): void {
    if (this.isEditBlanksModeActive) {
      doc.querySelectorAll('.generated-blank').forEach(blank => {
        blank.classList.add('editable-generated-blank');
      });
    } else {
      doc.querySelectorAll('.editable-generated-blank').forEach(blank => {
        blank.classList.remove('editable-generated-blank');
      });
    }
  }

  /**
   * Updates the blank elements in both the editor and generated content.
   */
  private updateBlankElements(): void {
    const updateElement = (element: Element) => {
      const position = element.getAttribute('data-position');
      if (position && this.blankInfo.has(position)) {
        const { id, word } = this.blankInfo.get(position)!;
        element.setAttribute('data-blank-id', id.toString());
        element.setAttribute('data-word', word || '');
        element.textContent = word;
      }
    };

    if (this.editorInstance) {
      this.editorInstance.getBody().querySelectorAll('.generated-blank').forEach(updateElement);
    }

    const generatedContentContainer = document.getElementById('generated-content-container');
    if (generatedContentContainer) {
      generatedContentContainer.querySelectorAll('.generated-blank').forEach(updateElement);
    }
  }

  /**
   * Updates an existing task with new content and blanks.
   * @param {string} content - The updated content of the task
   * @param {BlankDTO[]} blanks - The new blanks in the task
   * @param {boolean} hasTable - Indicates if the task contains a table
   */
  private updateExistingTask(content: SafeHtml, blanks: BlankDTO[], hasTable: boolean): void {
    /* const existingBlanks = Array.from(this.blankInfo.entries()).map(([position, { id, word }]) => ({
      id,
      word,
      position,
      isDistractor: false
    }));
    const updatedBlanks = this.mergeBlankArrays(existingBlanks, blanks);

    // Handle distractors
    const existingDistractors = this.distractors.filter(d => d.id !== undefined && d.id !== -1);
    const newDistractors = this.distractors.filter(d => d.id === undefined || d.id === -1);

    const updatedDistractors = [
      ...existingDistractors.map((distractor, index) => ({
        ...distractor,
        position: '-1',
        id: distractor.id || -1,
        isDistractor: true
      })),
      ...newDistractors.map((distractor, index) => ({
        ...distractor,
        position: '-1',
        id: -1,
        isDistractor: true
      }))
    ];

    const allBlanksAndDistractors = [...updatedBlanks, ...updatedDistractors];

    const stringContent = this.sanitizer.sanitize(SecurityContext.HTML, content) || '';
    const contentWithPlaceholders = this.replaceBlanksWithPlaceholders(stringContent);

    const updateTaskDto: FillinQuestionDTO = {
      id: this.currentTaskId,
      content: contentWithPlaceholders,
      taskType: this.form.get('taskType')?.value,
      table: hasTable,
      question: {
        id: this.currentTaskId!,
        conceptNodeName: this.form.get('conceptName')?.value,
        name: this.form.get('questionName')?.value,
        text: this.form.get('questionText')?.value,
        description: 'Question description 1',
        type: this.form.get('taskType')?.value,
        level: 3,
        isApproved: true,
        author: Number(this.userService.getTokenID()),
        score: 3
      },
      blanks: allBlanksAndDistractors
    };

    this.fillinQuestionService.updateFillinQuestion(updateTaskDto).subscribe(updatedTask => {
      console.log('Task updated successfully', updatedTask);
      this.currentTaskId = updatedTask.id;

      this.blankInfo.clear(); // Clear existing data
      this.distractors = [];
      updatedTask.blanks.forEach(blank => {
        if (blank.isDistractor) {
          this.distractors.push(blank);
        } else {
          this.blankInfo.set(blank.position!, { id: blank.id!, word: blank.word });
        }
      });
      // Sort distractors to maintain the original order
      this.distractors.sort((a, b) => {
        const aIndex = updatedDistractors.findIndex(d => d.word === a.word);
        const bIndex = updatedDistractors.findIndex(d => d.word === b.word);
        return aIndex - bIndex;
      });
      this.isExistingTask = true;
      this.updateBlankElements();
      this.updateGeneratedContent();
      this.updateGenerateTaskButtonText();
      this.updateEditorButtonStates();
    }); */
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event): void {
    if (this.editorInstance) {
      const editor = this.editorInstance;
      const clickedElement = event.target as HTMLElement;
      if (!editor.getContainer().contains(clickedElement)) {
        editor.fire('closemenu');
      }
    }
  }

  /**
   * Updates the text of the generate/update task button.
   */
  private updateGenerateTaskButtonText(): void {
    this.buttonText = this.isExistingTask ? 'Aufgabe aktualisieren' : 'Aufgabe erstellen';
  }

  /**
   * Gets the range of a word at a specific offset in a text node.
   * @param {any} editor - The TinyMCE editor instance
   * @param {Text} textNode - The text node containing the word
   * @param {number} offset - The offset within the text node
   * @returns {Range | null} A Range object representing the word, or null if no word is found
   */
  private getWordRange(editor: any, textNode: Text, offset: number): Range | null {
    const text = textNode.textContent || '';
    let start = offset, end = offset;
    while (start > 0 && !/\s/.test(text[start - 1])) start--;
    while (end < text.length && !/\s/.test(text[end])) end++;
    if (start !== end) {
      const range = editor.dom.createRng();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      return range;
    }
    return null;
  }

  /**
   * Processes the blanks in the document, assigning positions and updating their appearance.
   * @param {Document} doc - The Document object containing the editor content
   * @returns {BlankDTO[]} An array of BlankDTO objects representing the processed blanks
   */
  private processBlanks(doc: Document): detailedFillinBlankDTO[] {
    const blanks: detailedFillinBlankDTO[] = [];
    let blankIndex = 0;

    // Remove empty paragraphs and paragraphs with only <br> tags
    doc.querySelectorAll('p').forEach((p) => {
      if (p.innerHTML.trim() === '' || p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '<br data-mce-bogus="1">') {
        p.remove();
      }
    });

    doc.querySelectorAll('.text-blank, td.table-blank, .generated-blank, .distractor, .image-blank').forEach((blank) => {
      const isImage = blank.tagName.toLowerCase() === 'img';
      const word = isImage ? (blank as HTMLImageElement).src: (blank.getAttribute('data-word') || blank.textContent || ''); //  anstatt "Image-Blank"????
      const isDistractor = blank.classList.contains('distractor');

      // Skip empty or whitespace-only blanks
      if (!isImage && word.trim() === '') {
        blank.remove();
        return;
      }

      const blankDto: detailedFillinBlankDTO = {
        blankContent: word,
        position: blankIndex,
        isDistractor,
        isCorrect: true,
      };

      blanks.push(blankDto);

      if (!isDistractor) {
        if (isImage) {
          blank.classList.remove('image-blank');
          blank.classList.add('generated-blank');
          (blank as HTMLImageElement).setAttribute('data-word', word || '');
        } else {
          blank.textContent = '______';
          blank.className = 'generated-blank';
        }
        blank.setAttribute('data-position', blankIndex.toString());
        blank.setAttribute('data-word', word);
        blankIndex++;
      }
    });

    // Remove the data-processed attribute after processing
    // Clean up any remaining empty paragraphs
    doc.querySelectorAll('p').forEach((p) => {
      if (p.innerHTML.trim() === '') {
        p.remove();
      }
    });

    console.log("blanks", blanks);
    return blanks;
  }

  /**
   * Replaces placeholders in the content with the actual words.
   * @param {string} content - The content to process
   * @returns {string} The content with placeholders replaced by blanks
   */
  private replaceBlankPlaceholders(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('.generated-blank').forEach((blank: Element) => {
      const word = blank.getAttribute('data-word') || '';
      blank.textContent = word;
    });
    return doc.body.innerHTML;
  }

  /**
   * Replaces blanks in the content with placeholders.
   * @param {string} content - The content to process
   * @returns {string} The content with blanks replaced by placeholders
   */
  private replaceBlanksWithPlaceholders(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('.generated-blank').forEach((blank: Element) => {
      blank.textContent = '______';
    });
    return doc.body.innerHTML;
  }

  /**
   * Generates or updates a task based on the current editor content and form state.
   */
  generateTask(): void {
    /* if (!this.editorComponent) {
      console.error('TinyMCE editor component not found');
      return;
    }

    // Get the current content from the editor
    const content = this.editorComponent.getContent();
    const doc = new DOMParser().parseFromString(content, 'text/html');
    this.cleanupEditorContent(doc.body);
    // Check if the content contains a table
    const hasTable = !!doc.querySelector('table');
    this.form.patchValue({ hasTable });

    // Process the blanks in the content
    const blanks = this.processBlanks(doc);
    const sanitizedContent = this.sanitizeContent(doc);

    if (this.isExistingTask) {
      // Update the existing task
      this.updateExistingTask(sanitizedContent, blanks, hasTable);
    } else {
      // Save as a new task
      this.saveTask(sanitizedContent, blanks, hasTable);
    }

    // Update the generated content and editor
    this.generatedContent = this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
    this.editorComponent.setContent(doc.body.innerHTML);
    this.updateGeneratedContent();

    // Update the button text
    this.updateGenerateTaskButtonText(); */
  }

  /**
   * Saves a new task with the given content and blanks.
   * @param {SafeHtml} content - The content of the task
   * @param {BlankDTO[]} blanks - The blanks in the task
   * @param {boolean} hasTable - Indicates if the task contains a table
   */
  private saveTask(content: SafeHtml, blanks: BlankDTO[], hasTable: boolean): void {

    /* const stringContent = this.sanitizer.sanitize(SecurityContext.HTML, content) || '';
    const contentWithPlaceholders = this.replaceBlanksWithPlaceholders(stringContent);
    console.log('StringContent:', stringContent);
    console.log('content:', content);

    console.log("my blanks", blanks);
    console.log("my distractors", this.distractors);
    const allBlanks = [...blanks, ...this.distractors];
    const createTaskDto: FillinQuestionDTO = {
      content: contentWithPlaceholders,
      taskType: this.form.get('taskType')?.value,
      table: hasTable,
      question: {
        id: -1,
        conceptNodeName: this.form.get('conceptName')?.value,
        name: this.form.get('questionName')?.value,
        text: this.form.get('questionText')?.value,
        description: 'Question description 1',
        type: this.form.get('taskType')?.value,
        level: 3,
        isApproved: true,
        author: Number(this.userService.getTokenID()),
        score: 3
      },
      blanks: allBlanks
    };

    this.fillinQuestionService.createFillinQuestion(createTaskDto).subscribe(task => {
      this.currentTaskId = task.id;
      this.blankInfo.clear(); // Clear existing data
      this.distractors = [];
      task.blanks.forEach(blank => {
        if (blank.isDistractor) {
          this.distractors.push(blank);
        } else {
          this.blankInfo.set(blank.position!, { id: blank.id!, word: blank.word });
        }
        console.log("this task", task);
        console.log("this blanks", task.blanks);
      });
      this.isExistingTask = true;
      this.updateBlankElements();
      this.updateGeneratedContent();
      this.updateGenerateTaskButtonText();
      this.updateEditorButtonStates();
    }); */
  }

  /**
   * Merges existing blanks with new blanks, preserving existing blanks and adding new ones.
   * @param {BlankDTO[]} existingBlanks - Array of existing blanks
   * @param {BlankDTO[]} newBlanks - Array of new blanks
   * @returns {BlankDTO[]} Merged array of blanks
   */
  private mergeBlankArrays(existingBlanks: BlankDTO[], newBlanks: BlankDTO[]): BlankDTO[] {
    const mergedBlanks = new Map<string, BlankDTO>();

    // Add existing blanks to the map
    existingBlanks.forEach(blank => {
      mergedBlanks.set(blank.position!, { ...blank, isDistractor: false });
    });

    // Update or add new blanks
    newBlanks.forEach(blank => {
      if (mergedBlanks.has(blank.position!)) {
        const existingBlank = mergedBlanks.get(blank.position!)!;
        mergedBlanks.set(blank.position!, {
          ...existingBlank,
          ...blank,
          id: existingBlank.id, // Preserve the existing ID
          isDistractor: false
        });
      } else {
        mergedBlanks.set(blank.position!, { ...blank, id: -1, isDistractor: false });
      }
    });

    return Array.from(mergedBlanks.values());
  }



}
