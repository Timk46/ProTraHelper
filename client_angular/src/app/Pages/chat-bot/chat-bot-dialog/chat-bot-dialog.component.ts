import { AfterViewChecked, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LlmService, ChatSession, ChatBotMessage } from 'src/app/Services/ai/llm.service';
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

@Component({
  selector: 'app-chat-bot-dialog',
  template: `
    <div class="chat-container" [class]="display">
      <div class="chat-header">
        <button mat-icon-button (click)="closeChat()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="chat-content">
        <app-chat-session-list
          *ngIf="showSessions"
          [sessions]="sessions"
          [activeSessionId]="currentSession?.id"
          (sessionSelect)="onSessionSelect($event)"
          (newChat)="onNewChat()"
        ></app-chat-session-list>
        <div class="chat-messages">
          <div #messageContainer class="message-container">
            <div *ngFor="let message of messages; let i = index" class="message" [ngClass]="message.type">
              <div class="message-content" [innerHTML]="message.text"></div>
              <div *ngIf="message.type === 'bot' && message.id !== -1" class="rating">
                <button mat-icon-button
                  (click)="rateMessage(i, message.id, 1)"
                  [class.selected]="message.rating === 1"
                  [attr.aria-label]="'Bewertung: Schlecht'">
                  <mat-icon>sentiment_very_dissatisfied</mat-icon>
                </button>
                <button mat-icon-button
                  (click)="rateMessage(i, message.id, 2)"
                  [class.selected]="message.rating === 2"
                  [attr.aria-label]="'Bewertung: Neutral'">
                  <mat-icon>sentiment_neutral</mat-icon>
                </button>
                <button mat-icon-button
                  (click)="rateMessage(i, message.id, 3)"
                  [class.selected]="message.rating === 3"
                  [attr.aria-label]="'Bewertung: Gut'">
                  <mat-icon>sentiment_very_satisfied</mat-icon>
                </button>
              </div>
            </div>
          </div>
          <form [formGroup]="form" class="input-container">
            <mat-form-field appearance="outline">
              <input matInput
                formControlName="message"
                placeholder="Schreibe eine Nachricht..."
                (keydown.enter)="$event.preventDefault(); onClickSendMessage()">
            </mat-form-field>
            <button mat-icon-button
              [disabled]="!canSendMessage"
              (click)="onClickSendMessage()">
              <mat-icon>send</mat-icon>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./chat-bot-dialog.component.scss']
})
export class ChatBotDialogComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer: ElementRef | null = null;
  @Input() public display: string = '';
  @Output() public close: EventEmitter<void> = new EventEmitter<void>();

  public form: FormGroup;
  public messages: Array<Message> = [];
  public sessions: ChatSession[] = [];
  public currentSession?: ChatSession;
  protected canSendMessage = true;
  protected showSessions = true;
  private dialogSessionId: string;

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
    this.loadSessions();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private loadSessions(): void {
    this.llmService.getChatSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        if (!this.currentSession) {
          this.getBotMessage();
        }
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.getBotMessage();
      }
    });
  }

  public onSessionSelect(session: ChatSession): void {
    this.currentSession = session;
    this.messages = [];

    // Process messages in chronological order
    const sortedMessages = [...session.messages].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedMessages.forEach(msg => {
      if (!msg.isBot) {
        // User message
        this.messages.push({
          text: msg.question,
          type: MessageType.User,
          id: msg.id
        });
      }
      // Bot message
      if (msg.answer) {
        this.messages.push({
          text: this.markdownService.parse(msg.answer),
          type: MessageType.Bot,
          id: msg.id,
          rating: msg.ratingByStudent
        });
      }
    });

    // Scroll to bottom after loading messages
    setTimeout(() => this.scrollToBottom(), 0);
  }

  public onNewChat(): void {
    this.currentSession = undefined;
    this.messages = [];
    this.getBotMessage();
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
      const userMessage: Message = { text: message, type: MessageType.User, id: -1 };
      this.messages.push(userMessage);

      this.form.get('message')?.setValue('');
      this.form.updateValueAndValidity();
      this.sendQuestionToBot(message);
    }
  }

  private sendQuestionToBot(question: string): void {
    this.canSendMessage = false;
    const waitMessage: Message = { type: MessageType.Loading, id: -1 };
    this.messages.push(waitMessage);

    const context = this.messages
      .filter(msg => msg.type !== MessageType.Loading)
      .map(msg => ({
        role: msg.type === MessageType.User ? 'user' : 'assistant',
        content: msg.text || ''
      }));

    this.llmService.getLlmAnswerDialog(context, question, this.dialogSessionId, this.currentSession?.id).subscribe({
      next: (response: ChatBotMessage) => {
        this.messages.pop();
        const botMessage: Message = {
          text: this.markdownService.parse(response.answer),
          type: MessageType.Bot,
          id: response.id
        };
        this.messages.push(botMessage);
        this.canSendMessage = true;

        // Reload sessions to get the updated list with new session if created
        if (!this.currentSession) {
          this.loadSessions();
        }
      },
      error: (error: any) => {
        console.error(error);
        this.messages.pop();
        this.canSendMessage = true;
      }
    });
  }

  private scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    }
  }

  private getBotMessage(): void {
    this.canSendMessage = false;
    const waitMessage: Message = { type: MessageType.Loading, id: -1 };
    this.messages.push(waitMessage);

    setTimeout(() => {
      this.messages.pop();
      const botMessage: Message = {
        text: 'Hallo, wie kann ich dir helfen?',
        type: MessageType.Bot,
        id: -1
      };
      this.messages.push(botMessage);
      this.canSendMessage = true;
    }, 1000);
  }

  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  public rateMessage(messageIndex: number, messageId: number, rating: number): void {
    const message = this.messages[messageIndex];
    if (message && message.type === MessageType.Bot && message.id !== -1) {
      // Update local state immediately
      message.rating = rating;

      // Update in current session if it exists
      if (this.currentSession) {
        const sessionMessage = this.currentSession.messages.find(msg => msg.id === messageId);
        if (sessionMessage) {
          sessionMessage.ratingByStudent = rating;
        }
      }

      // Send rating to backend
      this.sendRatingToBackend(messageId, rating);
    }
  }

  private sendRatingToBackend(messageId: number, rating: number): void {
    this.http.post(`${environment.server}/chat-bot/rate`, { messageId, rating })
      .subscribe({
        next: (response: any) => {
          console.log('Rating saved successfully:', response);
          // Refresh sessions to get updated ratings
          this.loadSessions();
        },
        error: (error: any) => {
          console.error('Error saving rating:', error);
        }
      });
  }

  public closeChat(): void {
    this.close.emit();
  }
}
