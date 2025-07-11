import type { OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { MatDialog } from '@angular/material/dialog';
import type { TestResult } from '../../models/code-submission.model';
import { TestDetailsDialogComponent } from './test-details-dialog/test-details-dialog.component';

@Component({
  selector: 'app-test-indicators',
  templateUrl: './test-indicators.component.html',
  styleUrls: ['./test-indicators.component.scss'],
})
export class TestIndicatorsComponent implements OnChanges, OnInit {
  @Input() testResults: TestResult[] | undefined;

  passedTests: number = 0;
  totalTests: number = 0;

  // Neue Eigenschaften für verbesserte Visualisierung
  isNewResult: boolean = false;
  lastResultsHash: string = '';

  constructor(private readonly dialog: MatDialog) {}

  ngOnInit(): void {
    // Initialisierung
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['testResults'] && this.testResults) {
      // Berechne Test-Zusammenfassung
      this.calculateTestSummary();

      // Überprüfen, ob es neue Ergebnisse gibt
      const newResultsHash = this.calculateResultsHash();
      if (newResultsHash !== this.lastResultsHash) {
        this.lastResultsHash = newResultsHash;
        this.triggerNewResultAnimation();
      }
    }
  }

  /**
   * Berechnet die Zusammenfassung der Testergebnisse
   */
  private calculateTestSummary(): void {
    if (!this.testResults) {
      this.passedTests = 0;
      this.totalTests = 0;
      return;
    }

    this.totalTests = this.testResults.length;
    this.passedTests = this.testResults.filter(test => test.passed).length;
  }

  /**
   * Gibt die Zusammenfassung der Testergebnisse zurück
   */
  getTestSummary(): string {
    return `${this.passedTests}/${this.totalTests} Tests bestanden`;
  }

  /**
   * Gibt das CSS-Klassen-Objekt für den Zusammenfassungs-Text zurück
   */
  getSummaryClass(): { [key: string]: boolean } {
    return {
      'all-passed': this.passedTests === this.totalTests && this.totalTests > 0,
      'some-failed': this.passedTests < this.totalTests && this.passedTests > 0,
      'all-failed': this.passedTests === 0 && this.totalTests > 0,
    };
  }

  /**
   * Öffnet den Dialog mit den Testdetails für einen Test
   */
  openTestDetails(test: TestResult): void {
    this.dialog.open(TestDetailsDialogComponent, {
      width: '500px',
      data: test,
    });
  }

  /**
   * Öffnet den Dialog mit allen Testdetails
   */
  openAllTestsDetails(): void {
    if (this.testResults && this.testResults.length > 0) {
      this.dialog.open(TestDetailsDialogComponent, {
        width: '600px',
        data: {
          allTests: this.testResults,
          isListView: true,
        },
      });
    }
  }

  /**
   * Generiert einen detaillierten Tooltip für den Test
   */
  getDetailedTooltip(test: TestResult): string {
    let tooltip = `Test ${test.name}: ${test.passed ? 'Bestanden' : 'Fehlgeschlagen'}`;

    if (!test.passed && test.exception) {
      // Zeige den ersten Teil der Fehlermeldung, wenn vorhanden
      const shortError = test.exception.split('\n')[0].substring(0, 50);
      tooltip += `\nFehler: ${shortError}${test.exception.length > 50 ? '...' : ''}`;
    }

    return tooltip;
  }

  /**
   * Generiert einen Hash basierend auf den Testergebnissen,
   * um Änderungen zu erkennen
   */
  private calculateResultsHash(): string {
    if (!this.testResults || this.testResults.length === 0) {
      return '';
    }

    return this.testResults.map(test => `${test.name}:${test.passed ? 'pass' : 'fail'}`).join('|');
  }

  /**
   * Löst die Animation für neue Ergebnisse aus
   */
  private triggerNewResultAnimation(): void {
    this.isNewResult = true;

    // Animation nach kurzer Zeit zurücksetzen
    setTimeout(() => {
      this.isNewResult = false;
    }, 2000);
  }
}
