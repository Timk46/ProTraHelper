import { Component, EventEmitter, HostListener, Input, Output, ViewChild, AfterViewChecked, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router'; // Import Router
import { MatDialog } from '@angular/material/dialog';
import { LlmService, ChatSession, ChatBotMessage } from 'src/app/Services/ai/llm.service';
import { VideoTimeStampComponent } from '../video-time-stamp/video-time-stamp.component';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

enum MessageType {
  Bot = 'bot',
  User = 'user',
  Loading = 'loading',
}

interface Message {
  text?: string;
  type: MessageType;
  id: number;
  rating?: number;
  justRated?: boolean;
}

@Component({
  selector: 'app-chat-bot-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss'],
})
export class ChatBotDialogComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private readonly messageContainer: ElementRef | null = null;
  @Input() public display: string = '';
  @Output() public close: EventEmitter<void> = new EventEmitter<void>();

  public form: FormGroup;
  public messages: Message[] = [];
  public sessions: ChatSession[] = [];
  public currentSession?: ChatSession;
  protected canSendMessage = true;
  protected showSessions = true;
  private readonly dialogSessionId: string;
  private isInitialGreeting = true;

  lecture: string = 'OFP';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly llmService: LlmService,
    private readonly el: ElementRef,
    private readonly dialog: MatDialog,
    private readonly http: HttpClient,
    private readonly router: Router, // Inject Router
  ) {
    this.form = this.formBuilder.group({
      message: [''],
    });
    this.dialogSessionId = this.generateRandomString(20);
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  ngAfterViewChecked(): void {
    //this.scrollToBottom();
  }

  private loadSessions(): void {
    this.llmService.getChatSessions().subscribe({
      next: sessions => {
        this.sessions = sessions;
        if (!this.currentSession && this.isInitialGreeting) {
          this.getBotMessage();
          this.isInitialGreeting = false;
        }
      },
      error: error => {
        console.error('Error loading sessions:', error);
        if (this.isInitialGreeting) {
          this.getBotMessage();
          this.isInitialGreeting = false;
        }
      },
    });
  }

  public onSessionSelect(session: ChatSession): void {
    this.currentSession = session;
    this.messages = [];

    // Process messages in chronological order
    const sortedMessages = [...session.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    sortedMessages.forEach(msg => {
      if (!msg.isBot) {
        // User message
        this.messages.push({
          text: msg.question,
          type: MessageType.User,
          id: msg.id,
        });
      }
      // Bot message
      if (msg.answer) {
        this.messages.push({
          text: msg.answer,
          type: MessageType.Bot,
          id: msg.id,
          rating: msg.ratingByStudent,
          justRated: false,
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
        content: msg.text || '',
      }));

    const currentUrl = this.router.url; // Get current URL

    this.llmService
      .getLlmAnswerDialog(
        context,
        question,
        this.dialogSessionId,
        currentUrl,
        this.currentSession?.id,
      )
      .subscribe({
        // Pass currentUrl
        next: (response: ChatBotMessage) => {
          this.messages.pop();
          const botMessage: Message = {
            text: response.answer,
            type: MessageType.Bot,
            id: response.id,
            justRated: false,
          };
          this.messages.push(botMessage);
          this.canSendMessage = true;

          // Update the session list in memory with the new message
          if (this.currentSession) {
            const sessionInList = this.sessions.find(s => s.id === this.currentSession!.id);
            if (sessionInList) {
              // Add the new message (response DTO) to the session's message list
              // Ensure the response object matches the expected structure or adapt as needed
              sessionInList.messages.push(response);
            }
          }

          // If this was the first message of a new session, update currentSession with the ID from the response
          // and reload sessions to get full details (including the title generated by the backend)
          if (!this.currentSession && response.sessionId) {
            // Update the current session locally so subsequent messages use the correct ID
            this.currentSession = { id: response.sessionId } as ChatSession; // Cast as partial ChatSession
            // Reload sessions to get the full session details and update the list
            this.loadSessions();
          }
        },
        error: (error: any) => {
          console.error(error);
          this.messages.pop();
          this.canSendMessage = true;
        },
      });
  }

  private scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
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
        id: -1,
        justRated: false,
      };
      this.messages.push(botMessage);
      this.canSendMessage = true;
    }, 500);
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
      message.justRated = true;

      // Reset justRated after animation
      setTimeout(() => {
        message.justRated = false;
      }, 1000);

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
    this.http.post(`${environment.server}/chat-bot/rate`, { messageId, rating }).subscribe({
      next: (response: any) => {
        console.log('Rating saved successfully:', response);
        // Refresh sessions to get updated ratings
        this.loadSessions();
      },
      error: (error: any) => {
        console.error('Error saving rating:', error);
      },
    });
  }

  public closeChat(): void {
    this.close.emit();
  }
}
