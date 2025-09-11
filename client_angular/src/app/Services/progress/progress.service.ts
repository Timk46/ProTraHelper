import { Injectable } from '@angular/core';
import { GraphCommunicationService } from '../graph/graphCommunication.service';
import { timer, from, Observable } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';
import { ContentDTO, ContentElementDTO } from '@DTOs/index';
import { contentElementType } from '@DTOs/index';

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  /**
   * Instance of GraphCommunicationService (Singleton) for graph-related communications.
   * @private
   */
  private readonly graphCommunicationService: GraphCommunicationService =
    GraphCommunicationService.getInstance();

  constructor() {}

  /**
   * Triggers an update of the concept graph when an answer is submitted.
   * This method should be called whenever a user completes an action that affects their progress.
   * Uses concatMap to ensure operations happen in sequence and the graph update occurs after backend processing.
   */
  answerSubmitted(): void {
    // Use timer to create a small delay for backend processing
    timer(500)
      .pipe(
        concatMap(() => {
          console.log('Triggering graph update after backend processing (500ms delay)');
          this.graphCommunicationService.triggerGraphUpdate();
          return from(Promise.resolve()); // Convert to Observable for proper chaining
        }),
        catchError(error => {
          console.error('Error updating graph after answer submission:', error);
          return from(Promise.resolve()); // Continue the chain even if there's an error
        }),
      )
      .subscribe();
  }

  /**
   * Triggers a graph update when a new question is created
   */
  questionCreated(): void {
    this.graphCommunicationService.triggerGraphUpdate();
  }

  /**
   * Triggers a graph update when a question link is deleted
   */
  questionLinkDeleted(): void {
    this.graphCommunicationService.triggerGraphUpdate();
  }

  /**
   * Calculates the progress of a given content node by averaging the progress of its question elements.
   *
   * @param {ContentDTO} contentNode - The content node containing content elements.
   * @returns {number} - The average progress of the question elements within the content node.
   */
  calculateProgress(contentNode: ContentDTO): number {
    const questionElements: ContentElementDTO[] = contentNode.contentElements.filter(
      (element: ContentElementDTO) => element.type === contentElementType.QUESTION,
    );
    const progress =
      questionElements.reduce((acc, element) => {
        return acc + (element.question?.progress || 0);
      }, 0) / questionElements.length;
    return progress;
  }

  /**
   * Calculates the highest level of progress for a given content node.
   *
   * This function filters and sorts the content elements of the provided content node
   * to determine the highest level of progress achieved. It considers only elements
   * of type `QUESTION` that have a defined level and progress. The highest level is
   * determined by iterating through the sorted elements and checking their progress.
   *
   * @param contentNode - The content node containing the elements to be evaluated.
   * @returns The highest level of progress achieved for the given content node.
   */
  calculateLevelProgress(contentNode: ContentDTO): number {
    const sortedQuestionElements: ContentElementDTO[] = contentNode.contentElements
      .filter((element: ContentElementDTO) => element.type === contentElementType.QUESTION && element.question?.level)
      .sort((a: ContentElementDTO, b: ContentElementDTO) => a.question!.level - b.question!.level);

    let highestLevel = 0;
    for (let i = 0; i < sortedQuestionElements.length; i++) {
      const cv = sortedQuestionElements[i];
      if (cv.question!.progress < 100) {
        break;
      } else {
        // only change highestLevel if last element or next element has different (higher) level
        if (
          i == sortedQuestionElements.length - 1 ||
          sortedQuestionElements[i + 1].question!.level != cv.question!.level
        ) {
          highestLevel = cv.question!.level;
        }
      }
    }
    return highestLevel;
  }
}
