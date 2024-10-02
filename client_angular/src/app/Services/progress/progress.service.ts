import { Injectable } from '@angular/core';
import { GraphCommunicationService } from '../graph/graphCommunication.service';


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
   */
  answerSubmitted(): void {
    // Trigger an update of the concept graph
    this.graphCommunicationService.triggerGraphUpdate();

    // ToDo: auch contents for concept neu holen ?
    // ToDo: Fortschritt unten rechts direkt anzeigen und immer mit dieser Funktion neu?
  }

  questionCreated(): void {
    this.graphCommunicationService.triggerGraphUpdate();
  }

  questionLinkDeleted(): void {
    this.graphCommunicationService.triggerGraphUpdate();
  }
}
