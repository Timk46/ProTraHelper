import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChatBotMessageDTO } from '@DTOs/chatBot.dto';
import { LlmService } from 'src/app/Services/ai/llm.service';
import { MarkdownService } from 'src/app/Services/markdown/markdown.service';

export interface DialogData {
  question: string;
  messages: ChatBotMessageDTO[];
}

@Component({
  selector: 'app-dialog',
  templateUrl: './chat-bot-dialog.component.html',
  styleUrls: ['./chat-bot-dialog.component.scss'],
})
export class ChatBotDialogComponent {
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
  tempMessage: string = "";

  constructor(
    private llmService: LlmService,
    private markdownService: MarkdownService,
    public dialogRef: MatDialogRef<ChatBotDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  /**
   * Closes the dialog.
   */
  onNoClick(): void {
    this.dialogRef.close();
  }

  /**
   * Sends the user's question to the chatbot service and adds the response to the messages array.
   * The message array is displayed in the html.
   */
  askQuestion(): void {
    const message: ChatBotMessageDTO = {
      id: this.messages.length,
      question: this.question,
      createdAt: new Date(),
      isBot: false,
    };
    this.messages.push(message);
    const answerId = this.messages.length;
    let isFirstResponse: boolean = true;

    const botMessage: ChatBotMessageDTO = {
      id: answerId,
      question: '', // acutally answer not question
      createdAt: new Date(),
      isBot: true,
    };
    this.messages.push(botMessage);

    // getLlmAnswer only used for demonstration purposes here!
    const test = this.llmService.getLlmAnswer(this.question).subscribe((response) => {
      console.log("Basic GPT-4 QA Test Answer: " + response);
    });


    this.llmService.getLlmAnswerStream(this.question).subscribe({
      next: (response) => {
        if (isFirstResponse) {
          isFirstResponse = false;
        }
        this.tempMessage += response;
        this.messages[this.messages.length -1].question = this.markdownService.parse(this.tempMessage);
      },
      error: (error) => {
        console.log(error);
      },
      complete: () => {
        console.log("AI Answer for Querstion: '" + this.question + "' completed.");
      },
    });
  }
}

