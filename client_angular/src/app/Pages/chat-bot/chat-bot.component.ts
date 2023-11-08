import { Component } from '@angular/core';
import { ChatBotService } from '../../Services/ai/chat-bot.service';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';

import { MatDialog } from '@angular/material/dialog';
import { ChatBotDialogComponent } from './chat-bot-dialog/chat-bot-dialog.component';

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.scss']
})

export class ChatBotComponent {
  chatOpen: boolean = false;

  constructor(public dialog: MatDialog) { }

  openDialog(): void {
    this.chatOpen = true;
    const dialogRef = this.dialog.open(ChatBotDialogComponent, {
      width: '80%',
      height: 'auto',
    });

    dialogRef.afterClosed().subscribe(result => {
      this.chatOpen = false;
    });
  }
}
