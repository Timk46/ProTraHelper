import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LlmService } from 'src/app/Services/ai/llm.service';
import { MarkdownService } from 'src/app/Services/markdown/markdown.service';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';
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
  private dialogSessionId: string

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
    //this.scrollToBottom();
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(target.getAttribute('href'), this.lecture);
    }
  }

  private openModal(href: string | null, lecture: string) {
    this.dialog.open(VideoTimeStampComponent, { data: { href, lecture } });
  }

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

  public onClickEnter(event: Event): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
      this.onClickSendMessage();
    }
  }

  private scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    }
  }

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

  generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}
