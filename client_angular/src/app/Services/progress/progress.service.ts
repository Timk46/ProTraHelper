import { Injectable } from '@angular/core';
import { GraphCommunicationService } from '../graph/graphCommunication.service';
import { timer, from, Observable } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  /**
   * Instance of GraphCommunicationService (Singleton) for graph-related communications.
   * @private
   */
  private graphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();

  constructor() {}

  /**
   * Triggers an update of the concept graph when an answer is submitted.
   * This method should be called whenever a user completes an action that affects their progress.
   * Uses concatMap to ensure operations happen in sequence and the graph update occurs after backend processing.
   */
  answerSubmitted(): void {
    // Use timer to create a small delay for backend processing
    timer(500).pipe(
      concatMap(() => {
        console.log("Triggering graph update after backend processing (500ms delay)");
        this.graphCommunicationService.triggerGraphUpdate();
        return from(Promise.resolve()); // Convert to Observable for proper chaining
      }),
      catchError(error => {
        console.error('Error updating graph after answer submission:', error);
        return from(Promise.resolve()); // Continue the chain even if there's an error
      })
    ).subscribe();
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
}
