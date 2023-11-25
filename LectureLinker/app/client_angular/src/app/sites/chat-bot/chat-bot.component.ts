import { Component } from '@angular/core';
import { ChatBotMessageDTO } from '../../interfaces/chatBot.dto';
import { ChatBotService } from '../../services/ai/chat-bot.service';
import { MarkdownService } from '../../services/markdown/markdown.service';

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.scss']
})

export class ChatBotComponent {
  markdownTestString: string =
    "## Heading level 2\n Italicized text is the *cat's meow*. \n1. First item \n2. Second item \n3. Third item \n4. Fourth item \n" +
    '```javascript\nvar add2 = function(number) {\n   return number + 2; \n }\n```';
  message: ChatBotMessageDTO = {
    id: 12,
    question: this.markdownService.parse(this.markdownTestString),
    createdAt: new Date(),
    isBot: false,
  };

  messages: ChatBotMessageDTO[] = [];
  question: string = '';
  isloading: boolean = false;

  constructor(
    private chatBotService: ChatBotService,
    private markdownService: MarkdownService,
  ) {}


  /**
   * Sends the user's question to the chatbot service and adds the response to the messages array.
   * The message array is displayed in the html.
   */
  askQuestion(): void {
    const message: ChatBotMessageDTO = {
      id: this.messages.length + 1,
      question: this.question,
      createdAt: new Date(),
      isBot: false,
    };
    this.messages.push(message);
    this.isloading = true;
    this.chatBotService.askQuestion(this.question, "RN1")
    .subscribe({
      next: (response) => {
      console.log(JSON.stringify(response));
      const botMessage: ChatBotMessageDTO = {
        id: this.messages.length + 1,
        question: this.markdownService.parse(response.result), // parse markdown to html here
        createdAt: new Date(),
        isBot: true,
        usedChunks: response.usedChunks,
      };
      console.log(botMessage.usedChunks);
      this.isloading = false;
      this.messages.push(botMessage);
    },
      error: (error) => {
        console.log(error);
        this.isloading = false;
      },
    });
    this.question = '';
  }
}
