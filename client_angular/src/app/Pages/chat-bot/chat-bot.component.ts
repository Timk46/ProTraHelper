import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Output } from '@angular/core';

enum DisplayType {
  Fixed = 'fixed-chat',
  Collapsible = 'collapsible-chat',
  Embedded = 'embedded-chat',
}

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.scss'],
  animations: [
    // Animation for rotating the icon
    trigger('rotateAnimation', [
      state('rotated', style({ transform: 'rotate(0deg)' })),
      state('default', style({ transform: 'rotate(-360deg)' })),
      transition('default => rotated', animate('500ms ease-out')),
      transition('rotated => default', animate('500ms ease-out')),
    ]),
    // Animation for fading in and out
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-in-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('150ms ease-in-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class ChatBotComponent {
  @Output() close = new EventEmitter<void>();

  public isOpen = true; // Always open in the popup view
  public iconState = 'default'; // State for the rotation animation
  public displayType = DisplayType; // Enum for display types

  /**
   * Emits the close event to the parent component.
   */
  public onChatClose(): void {
    this.close.emit();
  }
}
