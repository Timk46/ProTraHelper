import { AfterViewChecked, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LlmService } from 'src/app/Services/ai/llm.service';
import { MarkdownService } from 'src/app/Services/markdown/markdown.service';
import { VideoTimeStampComponent } from '../../../Modules/tutor-kai/sites/video-time-stamp/video-time-stamp.component';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

enum MessageType {
  Bot = 'bot',
  User = 'user',
  Loading = 'loading'
}

interface Message {
  text?: string;
  type: MessageType;
  id: number;
  rating?: number;
}

interface ComponentChatBotResponse {
  content: string;
  messageId: number;
}

@Component({
  selector: 'app-chat-bot-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss'],
})
export class ChatBotDialogComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer: ElementRef | null = null;
  @Input() public display: string = '';
  @Output() public close: EventEmitter<void> = new EventEmitter<void>();

  public form: FormGroup;
  public messages: Array<Message> = [];
  protected canSendMessage = true;
  private dialogSessionId: string;

  /**
   * The current lecture.
   */
  lecture: string = 'OFP';

  constructor(
    private formBuilder: FormBuilder,
    private llmService: LlmService,
    private markdownService: MarkdownService,
    private el: ElementRef,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    this.form = this.formBuilder.group({
      message: ['']
    });
    this.dialogSessionId = this.generateRandomString(20);
  }

  ngOnInit(): void {
    this.getBotMessage();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /**
   * Listens for click events on urls for lecturelinker so we can open the videoplayer instead.
   * @param event The mouse event.
   */
  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(target.getAttribute('href'), this.lecture);
    }
  }

  /**
   * Opens a modal dialog for video timestamp.
   * @param href The link to the video.
   * @param lecture The current lecture.
   */
  private openModal(href: string | null, lecture: string) {
    this.dialog.open(VideoTimeStampComponent, { data: { href, lecture } });
  }

  /**
   * Handles the send message button click.
   */
  public onClickSendMessage(): void {
    const message = this.form.get('message')?.value;

    if (message && this.canSendMessage) {
      const userMessage: Message = { text: message, type: MessageType.User, id: -1 };
      this.messages.push(userMessage);

      this.form.get('message')?.setValue('');
      this.form.updateValueAndValidity();
      this.sendQuestionToBot(message);
    }
  }

  /**
   * Sends the question and chat history to the server.
   */
  private sendQuestionToBot(question: string): void {
    this.canSendMessage = false;
    const waitMessage: Message = { type: MessageType.Loading, id: -1 };
    this.messages.push(waitMessage);

    const context = this.messages.map(msg => ({
      role: msg.type === MessageType.User ? 'user' : 'assistant',
      content: msg.text || ''
    }));

    this.llmService.getLlmAnswerDialog(context, question, this.dialogSessionId).subscribe({
      next: (response: ComponentChatBotResponse) => {
        this.messages.pop();
        const botMessage: Message = {
          text: this.markdownService.parse(response.content),
          type: MessageType.Bot,
          id: response.messageId
        };
        this.messages.push(botMessage);
        this.canSendMessage = true;
      },
      error: (error: any) => {
        console.log(error);
        this.messages.pop();
        this.canSendMessage = true;
      }
    });
  }

  /**
   * Handles the Enter key press event to send a message.
   * @param event The keyboard event.
   */
  public onClickEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
      this.onClickSendMessage();
    }
  }

  /**
   * Scrolls the message container to the bottom.
   */
  private scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    }
  }

  /**
   * Gets the initial bot message.
   */
  private getBotMessage(): void {
    this.canSendMessage = false;
    const waitMessage: Message = { type: MessageType.Loading, id: -1 };
    this.messages.push(waitMessage);

    setTimeout(() => {
      this.messages.pop();
      const botMessage: Message = {
        text: 'Hallo, wie kann ich dir helfen?',
        type: MessageType.Bot,
        id: -1 // Use a placeholder ID for the initial message
      };
      this.messages.push(botMessage);
      this.canSendMessage = true;
    }, 1000);
  }

  /**
   * Generates a random string of specified length (for initial dialog session id).
   * @param length The length of the random string.
   * @returns A random string.
   */
  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * Rates a bot message.
   * @param messageId The ID of the message to rate.
   * @param rating The rating value (1, 2, or 3).
   */
  public rateMessage(messageId: number, rating: number): void {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message && message.type === MessageType.Bot && message.id !== -1) {
      message.rating = rating;
      this.sendRatingToBackend(messageId, rating);
    }
  }

  /**
   * Sends the rating to the backend.
   * @param messageId The ID of the message being rated.
   * @param rating The rating value (1, 2, or 3).
   */
  private sendRatingToBackend(messageId: number, rating: number): void {
    this.http.post(`${environment.server}/chat-bot/rate`, { messageId, rating })
      .subscribe({
        next: (response: any) => {
          console.log('Rating saved successfully:', response);
        },
        error: (error: any) => {
          console.error('Error saving rating:', error);
        }
      });
  }

  /**
   * Closes the chat dialog.
   */
  public closeChat(): void {
    this.close.emit();
  }
}
