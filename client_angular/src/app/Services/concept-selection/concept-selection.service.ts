import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConceptSelectionService {
  private selectedConceptIdSubject = new BehaviorSubject<number | null>(null);
  selectedConceptId$: Observable<number | null> = this.selectedConceptIdSubject.asObservable();

  constructor() { }

  /**
   * Sets the selected concept ID
   * @param conceptId The ID of the selected concept
   */
  setSelectedConceptId(conceptId: number): void {
    this.selectedConceptIdSubject.next(conceptId);
  }

  /**
   * Clears the selected concept ID
   */
  clearSelectedConceptId(): void {
    this.selectedConceptIdSubject.next(null);
  }
}
