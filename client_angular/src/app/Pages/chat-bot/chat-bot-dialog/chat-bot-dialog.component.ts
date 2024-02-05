import { Component, ElementRef, HostListener, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';
import { LlmService } from 'src/app/Services/ai/llm.service';
import { MarkdownService } from 'src/app/Services/markdown/markdown.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoTimeStampComponent } from '../../../Modules/tutor-kai/sites/video-time-stamp/video-time-stamp.component';

export interface DialogData {
  question: string;
  messages: ChatBotMessageDTO[];
}

@Component({
  selector: 'app-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss'],
})
export class ChatBotDialogComponent {
  markdownTestString: string =
    "**Test**: Here is an inline note.^[Inlines notes are easier to write, since you don't have to pick an identifier and move down to type the note.]";

  message: ChatBotMessageDTO = {
    id: 12,
    question: this.markdownService.parse(this.markdownTestString),
    createdAt: new Date(),
    isBot: false,
  };

  /**
   * The current lecture.
   */
  lecture: string = 'OFP';

  /**
   * The available lecture options.
   */
  lectureOptions: string[] = ['OFP', 'RN1', 'RN2'];

  /**
   * An array of messages exchanged in the chat.
   */
  messages: ChatBotMessageDTO[] = [];

  /**
   * The user's question.
   */
  question: string = '';

  /**
   * A boolean indicating if the chatbot is currently waiting for the stream to start
   */
  isLoading: boolean = false;

  /**
   * A boolean indicating if the chatbot is currently streaming.
   */
  isStreaming: boolean = false;


  constructor(
    private llmService: LlmService,
    private markdownService: MarkdownService,
    private el: ElementRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  /**
   * Handles click events on the component.
   * If the clicked element is a link, it prevents the default action and opens a modal with the lecture-video instead.
   */
  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(
        target.getAttribute('href'),
        this.lecture
        );
    }
  }

  /**
   * Opens a modal with the VideoTimeStampComponent and passes data to it.
   *
   * @param href - The href attribute of the clicked link.
   * @param lecture - The current lecture.
   */
  private openModal(href: string | null, lecture: string) {
    this.dialog.open(VideoTimeStampComponent, { data: { href, lecture } });
  }

  /**
   * Sends the user's question to the chatbot service and adds the response to the messages array.
   */
  askQuestion(): void {
    const message: ChatBotMessageDTO = {
      id: this.messages.length + 1,
      question: this.question,
      createdAt: new Date(),
      isBot: false,
    };
    this.messages.push(message);
    this.isLoading = true;
    this.messages.push({
      id: this.messages.length + 1,
      question: '',
      createdAt: new Date(),
      isBot: true,
    });
    const chatSubscription = this.llmService.getLlmAnswerStream(this.question)
    .subscribe({
      next: (data: string) => {
        this.isLoading = false;
        this.isStreaming = true;
        this.messages[this.messages.length - 1].question = this.markdownService.parse(data);
      },
      error: (error) => {
        console.log(error);
        this.isLoading = false;
        this.isStreaming = false;
        chatSubscription.unsubscribe();
      },
      complete: () => {
        this.isLoading = false;
        this.isStreaming = false;
        chatSubscription.unsubscribe();
      }
    });
    this.question = '';
  }
}
