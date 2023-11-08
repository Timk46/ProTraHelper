import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';
import { ChatBotService } from 'src/app/Services/ai/chat-bot.service';

export interface DialogData {
  question: string;
  messages: ChatBotMessageDTO[];
}

@Component({
  selector: 'app-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss']
})
export class ChatBotDialogComponent {
  messages: ChatBotMessageDTO[] = [];
  question: string = '';

  constructor(
    private chatBotService: ChatBotService,
    public dialogRef: MatDialogRef<ChatBotDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }


  askQuestion(): void {
    const message: ChatBotMessageDTO = {
      id: this.messages.length + 1,
      question: this.question,
      createdAt: new Date(),
      isBot: false
    };
    this.messages.push(message);
    this.chatBotService.askQuestion(this.question).subscribe(response => {
      const botMessage: ChatBotMessageDTO = {
        id: this.messages.length + 1,
        question: response.answer,
        createdAt: new Date(),
        isBot: true,
        usedChunks: response.usedChunks
      };
      this.messages.push(botMessage);
    });
    this.question = '';
  }
}
