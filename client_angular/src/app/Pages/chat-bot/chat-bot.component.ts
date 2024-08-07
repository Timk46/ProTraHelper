import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';

enum DisplayType {
  Fixed = 'fixed-chat',
  Collapsible = 'collapsible-chat'
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
        animate('150ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('150ms ease-in-out', style({ opacity: 0 }))
      ])
    ]),
  ]
})
export class ChatBotComponent {
  private readonly botIconPath = '../../../assets/img/kai_logo_small_no_background.png'; // Path to the bot icon
  private readonly chatIconPath = '../../../assets/img/chat.png'; // Path to the chat icon

  public isOpen = false; // State to track if the chat bot is open or not
  public iconSrc = this.botIconPath; // Source for the icon image
  public iconState = 'default'; // State for the rotation animation

  public displayType = DisplayType; // Enum for display types

  /**
   * Toggles the state of the chat bot between open and closed.
   */
  public onChangeChatState(): void {
    this.isOpen = !this.isOpen; // Toggle the isOpen state
    this.iconState = this.iconState === 'default' ? 'rotated' : 'default'; // Toggle the icon rotation state

    // Update the icon source based on the isOpen state
    this.iconSrc = this.isOpen ? this.chatIconPath : this.botIconPath;
  }
}
