import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChatSession } from 'src/app/Services/ai/llm.service';

@Component({
  selector: 'app-chat-session-list',
  template: `
    <div class="session-list">
      <h3>Chat-Verlauf</h3>
      <div class="session-items">
        <div
          *ngFor="let session of sessions"
          class="session-item"
          [class.active]="session.id === activeSessionId"
          (click)="onSessionSelect(session)"
        >
          <div class="session-title">{{ session.title }}</div>
          <div class="session-date">{{ session.createdAt | date: 'dd.MM.yyyy HH:mm' }}</div>
        </div>
      </div>
      <div class="new-chat" (click)="onNewChat()">
        <mat-icon>add</mat-icon>
        Neuer Chat
      </div>
    </div>
  `,
  styles: [
    `
      .session-list {
        width: 250px;
        border-right: 1px solid #e0e0e0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      h3 {
        padding: 16px;
        margin: 0;
        border-bottom: 1px solid #e0e0e0;
      }

      .session-items {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .session-item {
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f5f5;
        }

        &.active {
          background-color: #e3f2fd;
        }
      }

      .session-title {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .session-date {
        font-size: 12px;
        color: #666;
      }

      .new-chat {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        border-top: 1px solid #e0e0e0;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f5f5;
        }

        mat-icon {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class ChatSessionListComponent {
  @Input() sessions: ChatSession[] = [];
  @Input() activeSessionId?: number;
  @Output() sessionSelect = new EventEmitter<ChatSession>();
  @Output() newChat = new EventEmitter<void>();

  onSessionSelect(session: ChatSession): void {
    this.sessionSelect.emit(session);
  }

  onNewChat(): void {
    this.newChat.emit();
  }
}
