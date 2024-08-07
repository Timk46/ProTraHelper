import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LlmService } from 'src/app/Services/ai/llm.service';
import { MarkdownService } from 'src/app/Services/markdown/markdown.service';
import { VideoTimeStampComponent } from '../../../Modules/tutor-kai/sites/video-time-stamp/video-time-stamp.component';

enum MessageType {
  Bot = 'bot',
  User = 'user',
  Loading = 'loading'
}

@Component({
  selector: 'app-chat-bot-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss'],
})
export class ChatBotDialogComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer: ElementRef | null = null;
  @Input() public display: string = '';

  public form: FormGroup;
  public messages: Array<{ text?: string; type: MessageType }> = [];
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
    private dialog: MatDialog
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
      const userMessage = { text: message, type: MessageType.User };
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
    const waitMessage = { type: MessageType.Loading };
    this.messages.push(waitMessage);

    const context = this.messages.map(msg => ({
      role: msg.type === MessageType.User ? 'user' : 'assistant',
      content: msg.text || ''
    }));

    const chatSubscription = this.llmService.getLlmAnswerStreamDialog(context, question, this.dialogSessionId).subscribe({
      next: (data: string) => {
        this.messages.pop();
        const botMessage = { text: this.markdownService.parse(data), type: MessageType.Bot };
        this.messages.push(botMessage);
        this.canSendMessage = false;
      },
      error: (error) => {
        console.log(error);
        this.messages.pop();
        this.canSendMessage = true;
        chatSubscription.unsubscribe();
      },
      complete: () => {
        this.canSendMessage = true;
        chatSubscription.unsubscribe();
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
    const waitMessage = { type: MessageType.Loading };
    this.messages.push(waitMessage);

    setTimeout(() => {
      this.messages.pop();
      const botMessage = { text: 'Hallo, wie kann ich dir helfen?', type: MessageType.Bot };
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
}
