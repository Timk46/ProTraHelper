import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentDTO, ContentElementDTO, contentElementType, ContentsForConceptDTO } from '@DTOs/index';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ContentElement } from '@DTOs/prisma.dto';

@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss'],
  animations: [
    trigger('contentExpand', [
      state('collapsed', style({
        height: '0',
        opacity: 0,
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('200ms ease-out'))
    ])
  ]
})
export class ContentListComponent {

  @Input() activeConceptNodeId: any;
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  expandedIndex = 0;
  panelOpenState = false;

  // emitter for refreshing
  @Output() fetchContentsForConcept = new EventEmitter<void>();

  constructor() { }

  /**
   * Generates an array with a specified number of elements.
   *
   * @param num - The number of elements in the array.
   * @returns An array with the specified number of elements.
   */
  getLevels(num: number) {
    return new Array(num);
  }


  /**
   * Checks if the given content has at least one content element of the specified type.
   *
   * @param content - The content object to check.
   * @param type - The type of content element to look for.
   * @returns `true` if the content has at least one element of the specified type, otherwise `false`.
   */
  hasContentElementType(content: ContentDTO, type: string): boolean {
    return content.contentElements.some((element) => element.type === type);
  }

  /**
   * Filters and returns the content elements of type QUESTION from the given content.
   *
   * @param {ContentDTO} content - The content object containing content elements.
   * @returns {ContentElement[]} An array of content elements that are of type QUESTION.
   */
  getQuestions(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.QUESTION);
  }

  /**
   * Retrieves the attachments from the given content.
   * Filters the content elements to include only those of type PDF or VIDEO.
   *
   * @param content - The content object containing content elements.
   * @returns An array of content elements that are either of type PDF or VIDEO.
   */
  getAttachments(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.PDF || element.type === contentElementType.VIDEO);
  }


}
