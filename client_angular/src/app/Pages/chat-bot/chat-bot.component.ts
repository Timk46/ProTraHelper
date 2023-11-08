import { Component } from '@angular/core';
import { ChatBotService } from '../../Services/ai/chat-bot.service';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.scss']
})

export class ChatBotComponent {
  messages: Message[] = [];
  question: string = '';

  constructor(private chatBotService: ChatBotService) { }

  askQuestion(): void {
    this.messages.push({ text: this.question, sender: 'user' });
    this.chatBotService.askQuestion(this.question).subscribe(response => {
      this.messages.push({ text: response.answer, sender: 'bot' });
      console.log("Frage:" + this.question+ "\n");
      console.log("Antowrt:\n" + response.answer + "\n\n");
      console.log("Used Chunks:\n" + response.usedChunks + "\n\n");
    });
    this.question = '';
  }
}
