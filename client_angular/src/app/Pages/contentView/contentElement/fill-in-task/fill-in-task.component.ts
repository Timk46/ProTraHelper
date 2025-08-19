import { OnInit, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Component, ViewChild, EventEmitter, Output, Inject, Input } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DialogRef } from '@angular/cdk/dialog';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import {
  QuestionDTO,
  BlankDTO,
  userAnswerFeedbackDTO,
  UserAnswerDataDTO,
  FillinQuestionDTO,
  UserFillinAnswerDTO,
} from '@DTOs/index';
import { FillinQuestionType } from '@DTOs/index';
import { UserService } from 'src/app/Services/auth/user.service';
import { SafeUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { Location } from '@angular/common';

interface ContentPart {
  type: 'sentence' | 'table';
  content: SentencePart[] | TableData | any;
}

interface SentencePart {
  type: 'text' | 'blank' | 'image';
  content: string | SafeUrl | null;
  id?: string;
  isImage?: boolean;
}

interface TableData {
  rows: TableRow[];
}

interface TableRow {
  cells: TableCell[];
}

interface TableCell {
  content: string | null;
  isBlank: boolean;
  isImage: boolean;
  id?: string;
}

interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
}

/**
 * @deprecated This component is deprecated and may be removed in future releases. Please use the new FillinTaskNewComponent instead.
 */
@Component({
  selector: 'app-fill-in-task',
  templateUrl: './fill-in-task.component.html',
  styleUrls: ['./fill-in-task.component.scss'],
})
export class FillinTaskComponent implements OnInit, OnDestroy {
  @ViewChild('tableContainer') tableContainer!: ElementRef;
  @Output() submitClicked = new EventEmitter<any>();
  @Input() conceptId!: number;
  @Input() questionId!: number;
  taskViewData!: TaskViewData;
  fillInTask!: FillinQuestionDTO;
  fillinTaskTypes = FillinQuestionType;
  questionData!: QuestionDTO;
  contentParts: ContentPart[] = [];
  options: BlankDTO[] = [];
  allContainers: string[] = ['options'];

  isLoading = true;
  isSending = false;
  submitDisabled = false;
  feedbackColor = '';
  feedbackText: userAnswerFeedbackDTO = {
    id: -1,
    userAnswerId: -1,
    score: -1,
    feedbackText: '',
    elementDone: false,
    progress: -1,
  };

  private readonly destroy$ = new Subject<void>();
  isCorrect = false;
  taskForm!: FormGroup;

  constructor(
    private readonly dialogRef: DialogRef,
    private readonly questionDataService: QuestionDataService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    private readonly location: Location,
  ) {
    this.taskViewData = data.taskViewData;
    this.taskForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadTask();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTask(): void {
    this.isLoading = true;
    this.questionDataService
      .getFillinTask(this.taskViewData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: task => {
          console.log('task', task);
          this.fillInTask = task;
          this.questionData = task.question;
          this.contentParts = this.processContent(task.content);
          this.options = this.shuffleOptions([...this.fillInTask.blanks]);
          this.initializeForm();
          this.updateAllContainers();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('Error loading task:', error);
          this.isLoading = false;
        },
      });
    setTimeout(() => {
      this.logContentStructure();
      console.log('content parts', this.contentParts);
    }, 1000);

    console.log('sentenceParts', this.contentParts);
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({});
    this.contentParts.forEach(part => {
      if (part.type === 'sentence') {
        (part.content as SentencePart[]).forEach(sentencePart => {
          if (sentencePart.type === 'blank' && sentencePart.id) {
            this.taskForm.addControl(sentencePart.id, new FormControl(''));
          }
        });
      } else if (part.type === 'table') {
        (part.content as TableData).rows.forEach(row => {
          row.cells.forEach((cell: any) => {
            if (cell.isBlank && cell.id) {
              this.taskForm.addControl(cell.id, new FormControl(''));
            }
          });
        });
      }
    });
  }

  private logContentStructure(): void {
    this.contentParts.forEach((part, index) => {
      console.log(`Part ${index + 1}: ${part.type}`);
      if (part.type === 'sentence') {
        (part.content as SentencePart[]).forEach((sentencePart, sentenceIndex) => {
          console.log(
            `  Sentence part ${sentenceIndex + 1}: ${sentencePart.type} - ${sentencePart.content}`,
          );
        });
      } else if (part.type === 'table') {
        console.log(`  Table with ${(part.content as TableData).rows.length} rows`);
      }
    });
  }

  private processContent(content: string): ContentPart[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const parts: ContentPart[] = [];
    const imageOptions: BlankDTO[] = [];

    // Process text nodes and spans
    const processTextAndSpans = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim()) {
          parts.push({ type: 'sentence', content: [{ type: 'text', content: node.textContent }] });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'SPAN' && element.classList.contains('generated-blank')) {
          parts.push({
            type: 'sentence',
            content: [
              {
                type: 'blank',
                content: null,
                id: `blank-${element.getAttribute('data-position')}`,
              },
            ],
          });
        } else if (element.tagName === 'IMG' && element.classList.contains('generated-blank')) {
          parts.push({
            type: 'sentence',
            content: [
              {
                type: 'image',
                content: element.getAttribute('src') || '',
                id: `blank-${element.getAttribute('data-position')}`,
              },
            ],
          });
        } else {
          element.childNodes.forEach(processTextAndSpans);
        }
      }
    };

    // Process the content
    doc.body.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'TABLE') {
          // Process table
          parts.push({ type: 'table', content: this.processTable(element as HTMLTableElement) });

          // Extract image blanks from the table
          element
            .querySelectorAll('td.image-blank img, td img.generated-blank')
            .forEach((img, index) => {
              const src = img.getAttribute('src') || '';
              imageOptions.push({
                id: Number(`image-blank-${index}`),
                blankContent: src,
                imageUrl: src,
                position: index.toString(),
                isImage: true, // Add this line
              });
            });
        } else {
          processTextAndSpans(element);
        }
      } else {
        processTextAndSpans(node);
      }
    });

    // Add image options to the existing options
    this.options = [...this.options, ...imageOptions];

    console.log('Processed content:', parts);
    return parts;
  }

  private processTable(tableElement: HTMLTableElement): TableData {
    return {
      rows: Array.from(tableElement.querySelectorAll('tr')).map((row, rowIndex) => ({
        cells: Array.from(row.querySelectorAll('td')).map((cell, colIndex) => {
          console.log('Cell:', cell);
          const isBlank =
            cell.classList.contains('generated-blank') ||
            cell.classList.contains('image-blank') ||
            cell.querySelector('img[class*="generated-blank"]') !== null;
          const isImage =
            cell.classList.contains('image-blank') || cell.querySelector('img') !== null;
          let content = '';
          let id: string | undefined;

          if (isBlank) {
            content = '';
            id = `blank-table-${rowIndex}-${colIndex}`;
          } else if (isImage) {
            const imgElement = cell.querySelector('img');
            content = imgElement ? imgElement.getAttribute('src') || '' : '';
          } else {
            content = cell.textContent || '';
          }

          return {
            content: content,
            isBlank: isBlank,
            isImage: isImage,
            id: id,
          };
        }),
      })),
    };
  }

  isImageOption(option: BlankDTO): boolean {
    return !!option.isImage || (!!option.blankContent && this.isImageContent(option.blankContent));
  }

  isImageContent(content: string): boolean {
    return (
      !!content &&
      (content.startsWith('data:image') ||
        content.startsWith('http') ||
        content.startsWith('https'))
    );
  }

  private updateAllContainers(): void {
    this.allContainers = ['options'];
    this.contentParts.forEach(part => {
      if (part.type === 'sentence') {
        (part.content as SentencePart[]).forEach(sentencePart => {
          if (sentencePart.type === 'blank' && sentencePart.id) {
            this.allContainers.push(sentencePart.id);
          }
        });
      } else if (part.type === 'table') {
        (part.content as TableData).rows.forEach((row: any) => {
          row.cells.forEach((cell: any) => {
            if (cell.isBlank && cell.id) {
              this.allContainers.push(cell.id);
            }
          });
        });
      }
    });
  }

  private shuffleOptions(options: BlankDTO[]): BlankDTO[] {
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  onDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    let item: BlankDTO | null = null;

    // Determine the source and target containers
    const sourceId = event.previousContainer.id;
    const targetId = event.container.id;

    // Handle dragging from 'options'
    if (sourceId === 'options') {
      item = event.previousContainer.data[event.previousIndex];
      // Remove the item from 'options'
      this.options.splice(event.previousIndex, 1);
    }
    // Handle dragging from a blank
    else {
      const sourceContent = this.getBlankContent(sourceId);
      if (sourceContent) {
        item = sourceContent;
        // Clear the source blank
        this.clearBlankContent(sourceId);
      }
    }

    // Get the current content of the target blank or 'options'
    const previousContent = this.getBlankContent(targetId);

    // Update the target with the new item
    if (targetId === 'options') {
      // Dragging back to 'options'
      if (item) {
        this.options.push(item);
      }
    } else {
      // Dragging to a blank
      this.updateBlankContent(targetId, item);
    }

    // Handle swapping if there was previous content
    if (previousContent) {
      if (targetId === 'options') {
        // Add the previous content back to 'options'
        this.options.push(previousContent);
      } else {
        // Assign the previous content to the source blank
        this.updateBlankContent(sourceId, previousContent);
      }
    }

    this.cdr.detectChanges();
  }

  private getBlankContent(blankId: string): BlankDTO | null {
    for (const part of this.contentParts) {
      if (part.type === 'sentence') {
        const sentencePart = (part.content as SentencePart[]).find(p => p.id === blankId);
        if (sentencePart?.content) {
          return {
            blankContent: sentencePart.content as string,
            isImage: sentencePart.isImage || false,
            imageUrl: sentencePart.isImage
              ? (sentencePart.content as string) || undefined
              : undefined,
          };
        }
      } else if (part.type === 'table') {
        for (const row of (part.content as TableData).rows) {
          const cell = row.cells.find((c: any) => c.id === blankId);
          if (cell?.content) {
            return {
              blankContent: cell.content,
              isImage: cell.isImage,
              imageUrl: cell.isImage ? cell.content : undefined,
            };
          }
        }
      }
    }
    return null;
  }

  private clearBlankContent(blankId: string): void {
    this.updateBlankContent(blankId, null);
  }

  private updateBlankContent(blankId: string, content: BlankDTO | null): void {
    this.contentParts.forEach(part => {
      if (part.type === 'sentence') {
        const sentencePart = (part.content as SentencePart[]).find(p => p.id === blankId);
        if (sentencePart) {
          sentencePart.content = content ? content.blankContent : null;
          sentencePart.isImage = content ? this.isImageContent(content.blankContent!) : false;
        }
      } else if (part.type === 'table') {
        (part.content as TableData).rows.forEach((row: TableRow) => {
          const cell = row.cells.find((c: any) => c.id === blankId);
          if (cell) {
            cell.content = content ? content.blankContent : '';
            cell.isImage = content ? this.isImageContent(content.blankContent!) : false;
          }
        });
      }
    });
  }

  submitTask(): void {
    this.isSending = true;
    const filledBlanks = this.gatherFilledBlanks();

    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.fillInTask.question.id,
      contentElementId: this.taskViewData.contentElementId,
      userId: Number(this.userService.getTokenID()),
      userFillinTextAnswer: filledBlanks,
    };

    this.questionDataService
      .createUserAnswer(userAnswerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.feedbackText = data;
          this.isSending = false;
          this.submitClicked.emit(data.progress);
          this.taskViewData.progress = Math.max(this.taskViewData.progress, data.progress);
          this.submitDisabled = true;
          this.updateIsCorrect();

          this.updateFeedbackColor();
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('Error submitting answer:', error);
          this.isSending = false;
        },
      });
    setTimeout(() => {
      this.submitDisabled = true;
    }, 500);
  }

  private gatherFilledBlanks(): UserFillinAnswerDTO[] {
    const filledBlanks: UserFillinAnswerDTO[] = [];
    Object.keys(this.taskForm.controls).forEach(key => {
      const value = this.taskForm.get(key)?.value;
      if (value) {
        filledBlanks.push({
          position: key.slice(6), // Remove 'blank-' prefix
          answer: value.toString(),
        });
      }
    });
    console.log('Filled blanks:', filledBlanks);
    return filledBlanks;
  }

  private updateFeedbackColor(): void {
    const score = this.feedbackText.score;
    const totalScore = this.questionData.score!;
    this.feedbackColor =
      score === totalScore ? '#a3be8c' : score >= totalScore * 0.5 ? '#ffa500' : '#ff0000';
  }

  private updateIsCorrect(): void {
    this.isCorrect = this.questionData.score === this.feedbackText.score;
  }

  retry(): void {
    this.submitDisabled = false;
    this.resetBlanks();
    this.options = this.shuffleOptions([...this.fillInTask.blanks]);
    this.updateAllContainers();
    this.feedbackText = {
      id: -1,
      userAnswerId: -1,
      score: -1,
      feedbackText: '',
      elementDone: false,
      progress: -1,
    };
    this.feedbackColor = '';
    this.cdr.detectChanges();
  }

  private resetBlanks(): void {
    this.contentParts.forEach(part => {
      if (part.type === 'sentence') {
        (part.content as SentencePart[]).forEach(sentencePart => {
          if (sentencePart.type === 'blank') sentencePart.content = null;
        });
      } else if (part.type === 'table') {
        (part.content as TableData).rows.forEach(row => {
          row.cells.forEach((cell: any) => {
            if (cell.isBlank) cell.content = '';
          });
        });
      }
    });
  }

  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    if (this.conceptId && this.questionId) {
      // Navigate to /dashboard/conceptOverview/:conceptId
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else if (this.conceptId) {
      // Navigate to /dashboard/conceptOverview
      this.location.replaceState(`/dashboard/conceptOverview`);
    } else {
      // Navigate to /dashboard
      this.location.replaceState(`/dashboard`);
    }
  }

  isSentencePart(content: any): content is SentencePart[] {
    return Array.isArray(content) && content.length > 0 && 'type' in content[0];
  }

  isTableData(content: SentencePart[] | TableData): content is TableData {
    return 'rows' in content;
  }

  /**
   * Determines the task type and returns the appropriate input type.
   */
  getInputType(): 'drag' | 'dropdown' | 'manual' {
    switch (this.fillInTask.taskType) {
      case 'FillInDrag':
        return 'drag';
      case 'FillInDropdown':
        return 'dropdown';
      case 'FillInManual':
        return 'manual';
      default:
        return 'drag';
    }
  }
}
