import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TestResult } from '../../../models/code-submission.model';

// Dialog-Daten können entweder ein einzelnes TestResult oder ein Objekt mit allTests sein
export interface TestDetailsDialogData {
  allTests?: TestResult[];
  isListView?: boolean;
  name?: string;
  passed?: boolean;
  exception?: string;
}

@Component({
  selector: 'app-test-details-dialog',
  templateUrl: './test-details-dialog.component.html',
  styleUrls: ['./test-details-dialog.component.scss']
})
export class TestDetailsDialogComponent implements OnInit {
  // Für Einzeltest-Ansicht
  showStack: boolean = false;

  // Für Listenansicht
  isListView: boolean = false;
  allTests: TestResult[] = [];
  shownExceptions: Set<number> = new Set(); // Speichert Indizes der angezeigten Ausnahmen

  constructor(@Inject(MAT_DIALOG_DATA) public data: TestResult | TestDetailsDialogData) {}

  ngOnInit(): void {
    // Analysiere die übergebenen Daten und bereite die entsprechende Ansicht vor
    this.isListView = this.isDataWithAllTests(this.data) && !!this.data.isListView;

    if (this.isListView && this.isDataWithAllTests(this.data) && this.data.allTests) {
      this.allTests = this.data.allTests;
    }
  }

  /**
   * Type Guard, um zu prüfen, ob die Daten die allTests-Eigenschaft haben
   */
  private isDataWithAllTests(data: any): data is TestDetailsDialogData {
    return 'allTests' in data || 'isListView' in data;
  }

  /**
   * Wechselt die Anzeige des Stacktraces (für Einzelansicht)
   */
  toggleStack(): void {
    this.showStack = !this.showStack;
  }

  /**
   * Schaltet die Anzeige der Ausnahmedetails für einen bestimmten Test um (für Listenansicht)
   */
  toggleExceptionDetails(index: number): void {
    if (this.shownExceptions.has(index)) {
      this.shownExceptions.delete(index);
    } else {
      this.shownExceptions.add(index);
    }
  }

  /**
   * Prüft, ob die Ausnahmedetails für einen bestimmten Test angezeigt werden sollen
   */
  isExceptionShown(index: number): boolean {
    return this.shownExceptions.has(index);
  }

  /**
   * Prüft, ob ein Exception-Stacktrace vorhanden ist (für Einzelansicht)
   */
  hasException(): boolean {
    if (!this.isDataWithAllTests(this.data)) {
      return !!this.data.exception && this.data.exception.trim().length > 0;
    }
    return false;
  }

  /**
   * Extrahiert den benutzerfreundlichen Testnamen aus dem vollqualifizierten Testnamen
   * Verschiedene Formate:
   * - "test_durchschnitt (test_main.TestFussballStatistik.test_durchschnitt)" -> "test_durchschnitt"
   * - "test" Property vom Backend -> Teil vor Klammer oder bei Punkt den letzten Teil
   */
  getShortTestName(fullTestName: string): string {
    if (!fullTestName) return '';

    // Fall 1: Format mit Klammern (Python-Unittests)
    if (fullTestName.includes('(')) {
      return fullTestName.split('(')[0].trim();
    }

    // Fall 2: Format mit Punkten (Java-Tests oder andere qualifizierte Namen)
    if (fullTestName.includes('.')) {
      const parts = fullTestName.split('.');
      return parts[parts.length - 1].trim(); // Letzten Teil verwenden
    }

    // Fallback: Original-Name verwenden
    return fullTestName;
  }
}
