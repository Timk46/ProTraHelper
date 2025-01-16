import { Component, Input } from '@angular/core';
import { ContentElementDTO, contentElementType, questionType } from '@DTOs/index';

@Component({
  selector: 'app-content-list-item',
  templateUrl: './content-list-item.component.html',
  styleUrls: ['./content-list-item.component.scss']
})
export class ContentListItemComponent {

  @Input() contentElementData: ContentElementDTO = {
    id : -1,
    type: contentElementType.TEXT,
    positionInSpecificContentView: -1,
    question: {
      id: -1,
      type: 'task',
      level: -1,
      progress: -1,
      name: '',
      description: '',
    }
  };

  constructor() {

  }

  /**
   * Generates a more readable name for a given question type.
   *
   * @param type - The type of the question.
   * @returns A string representing the more readable name of the question type.
   */
  getQuestionTypeReadable(type: string | undefined): string {
    switch (type) {
      case questionType.MULTIPLECHOICE:
        return 'Multiple Choice';
      case questionType.SINGLECHOICE:
        return 'Single Choice';
      case questionType.FREETEXT:
        return 'Freitext';
      case questionType.FILLIN:
        return 'Lückentext';
      case questionType.CODE:
        return 'Programmieraufgabe';
      case questionType.GRAPH:
        return 'Graphaufgabe';
      default:
        return 'Aufgabe';
    }
  }

  /**
   * Returns the corresponding icon name for a given question type.
   *
   * @param type - The type of the question. It can be one of the following:
   * @returns The name of the icon corresponding to the given question type.
   */
  getQuestionTypeIcon(type: string | undefined): string {
    switch (type) {
      case questionType.MULTIPLECHOICE:
        return 'list';
      case questionType.SINGLECHOICE:
        return 'radio_button_checked';
      case questionType.FREETEXT:
        return 'text_fields';
      case questionType.FILLIN:
        return 'short_text';
      case questionType.CODE:
        return 'code';
      case questionType.GRAPH:
        return 'device_hub';
      default:
        return 'help';
    }
  }

}
