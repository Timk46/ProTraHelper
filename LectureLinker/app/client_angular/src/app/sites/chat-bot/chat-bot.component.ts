import { Component, ElementRef, HostListener } from '@angular/core';
import { ChatBotMessageDTO } from '../../interfaces/chatBot.dto';
import { ChatService } from '../../services/ai/chat..service';
import { MarkdownService } from '../../services/markdown/markdown.service';
import { MatDialog } from '@angular/material/dialog';
import { VideoTimeStampComponent } from './video-time-stamp/video-time-stamp.component';

@Component({
  selector: 'app-chat-bot',
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.scss'],
})

/**
 * ChatBotComponent is a class that handles the interaction between the user and the chatbot.
 * It uses the chatService to send the user's question and receive the chatbot's response with Websockets.
 * It also uses the markdownService to parse markdown strings.
 */
export class ChatBotComponent {

  markdownTestString: string =
    "**Test**: Here is an inline note.^[Inlines notes are easier to write, since you don't have to pick an identifier and move down to type the note.]";

  message: ChatBotMessageDTO = {
    id: 12,
    question: this.markdownService.parse(this.markdownTestString),
    createdAt: new Date(),
    isBot: false,
  };

  /**
   * The current lecture.
   */
  lecture: string = 'OFP';

  /**
   * The available lecture options.
   */
  lectureOptions: string[] = ['OFP', 'RN1'];

  /**
   * An array of messages exchanged in the chat.
   */
  messages: ChatBotMessageDTO[] = [];

  /**
   * The user's question.
   */
  question: string = '';

  /**
   * A boolean indicating if the chatbot is currently loading a response.
   */
  isloading: boolean = false;

  /**
   * The current loading answer from the chatbot.
   */
  currentLoadingAnswer: string = '';

  constructor(
    private chatService: ChatService,
    private markdownService: MarkdownService,
    private el: ElementRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  /**
   * Handles click events on the component.
   * If the clicked element is a link, it prevents the default action and opens a modal with the lecture-video instead.
   */
  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault();
      this.openModal(
        target.getAttribute('href'),
        this.lecture
        );
    }
  }

  /**
   * Opens a modal with the VideoTimeStampComponent and passes data to it.
   *
   * @param href - The href attribute of the clicked link.
   * @param lecture - The current lecture.
   */
  private openModal(href: string | null, lecture: string) {
    this.dialog.open(VideoTimeStampComponent, { data: { href, lecture } });
  }

  /**
   * Sends the user's question to the chatbot service and adds the response to the messages array.
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
    this.messages.push({
      id: this.messages.length + 1,
      question: '',
      createdAt: new Date(),
      isBot: true,
    });
    const chatSubscription = this.chatService.getChatStream(this.lecture, this.question)
    .subscribe({
      next: (data: string) => {
        this.isloading = false;
        this.currentLoadingAnswer += data;
        this.messages[this.messages.length - 1].question = this.markdownService.parse(this.currentLoadingAnswer);
      },
      error: (error) => {
        console.log(error);
        this.isloading = false;
        this.currentLoadingAnswer = '';
        chatSubscription.unsubscribe();
      },
      complete: () => {
        this.isloading = false;
        this.currentLoadingAnswer = '';
        console.log(JSON.stringify(this.messages[this.messages.length - 1]));
        chatSubscription.unsubscribe();
      }
    });
    this.question = '';
  }
}
