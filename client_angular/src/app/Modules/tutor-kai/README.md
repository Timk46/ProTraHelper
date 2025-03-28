# Tutor-Kai Modul

Das Tutor-Kai Modul ist eine Angular-Komponente, die eine interaktive Programmierumgebung für Studierende bietet. 
Sie ermöglicht es Studierenden, Programmieraufgaben zu lösen, Code auszuführen und automatisiertes Feedback zu erhalten.

> **Hinweis für neue Entwickler**: Dieses Dokument enthält wichtige Informationen zur Architektur, Datenmodellen und Best Practices für die Erweiterung des Moduls.

## Modulstruktur

```
tutor-kai/
├── components/              # Wiederverwendbare Komponenten
│   ├── code-editor-wrapper/ # Wrapper für den Monaco Code-Editor
│   ├── editor-tabs/         # Tabs für geöffnete Dateien (VSCode-ähnlich)
│   ├── feedback-panel/      # Panel für KI-Feedback-Anzeige
│   ├── file-explorer/       # Dateisystem-Explorer (VSCode-ähnlich)
│   ├── rating/              # Komponente für Feedback-Bewertung
│   ├── terminal-output/     # Terminal für Compiler-Ausgabe
│   └── test-indicators/     # Anzeige von Unit-Test-Ergebnissen
│       └── test-details-dialog/ # Dialog für Testdetails
├── models/                  # Datenmodelle
│   └── code-submission.model.ts # Modelle für Code-Submission und Ergebnisse
├── services/                # Services für die Modullogik
│   ├── file-system.service.ts # Verwaltung von Dateien und Dateistruktur
│   └── workspace-state.service.ts # State-Management für den Workspace
├── sites/                   # Hauptseiten des Moduls
│   ├── code-editor/         # Monaco-Editor Integration
│   ├── student-workspace/   # Hauptarbeitsbereich für Studierende
│   └── video-time-stamp/    # Video-Komponente mit Zeitstempel-Unterstützung
├── tutor-kai.component.ts   # Hauptkomponente des Moduls
├── tutor-kai.module.ts      # Moduldefinition und Importdeklarationen
└── tutor-kai-routing.module.ts # Routing-Konfiguration
```

## Komponenten

### StudentWorkspaceComponent

Die Hauptkomponente für die Studierendensicht. Sie orchestriert alle anderen Komponenten und bietet:

- VSCode-ähnliches Layout mit File Explorer und Editor-Bereich
- Split-Panel Layout mit anpassbaren Größen
- Aufgabenbeschreibung und Code-Editor nebeneinander
- Terminal-Ausgabe für Compiler-Meldungen
- Test-Indikatoren für Unit-Tests
- Feedback-Bereich für KI-generiertes Feedback
- Responsive Design für verschiedene Gerätetypen

### CodeEditorWrapperComponent

Kapselt den Monaco-Editor und bietet:

- Sprachspezifische Konfiguration (Python, Java, etc.)
- Verwaltung mehrerer Dateien mit Tabs
- Eingabefelder für Programmargumente
- Code-Submission-Funktionalität
- Intelligentes Fokus-Management im Editor

### TerminalOutputComponent

Zeigt die Compiler- und Programmausgabe an:

- Farbliche Hervorhebung von Fehlern
- Ladezustand während der Ausführung
- Scrollbare Anzeige für lange Ausgaben

### TestIndicatorsComponent

Visualisiert die Ergebnisse von Unit-Tests:

- Farbige Kreise für jeden Test (grün/rot)
- Zusammenfassung der Testergebnisse
- Klickbare Indikatoren für Detailanzeige

#### TestDetailsDialogComponent

Dialog-Komponente zur Anzeige von Testdetails:

- Unterstützt zwei Ansichtsmodi:
  - Einzelansicht: Details zu einem bestimmten Test
  - Listenansicht: Übersicht aller Tests mit ein-/ausklappbaren Details
- Verarbeitet verschiedene Testnamensformate:
  ```typescript
  getShortTestName(fullTestName: string): string {
    // Für Python-Tests mit Klammer-Notation
    if (fullTestName.includes('(')) {
      return fullTestName.split('(')[0].trim();
    }
    
    // Für Java-Tests mit Punktnotation
    if (fullTestName.includes('.')) {
      const parts = fullTestName.split('.');
      return parts[parts.length - 1].trim();
    }
    
    return fullTestName;
  }
  ```
- Verwendet Type Guards für sichere Typrüfung

### FeedbackPanelComponent

Zeigt KI-generiertes Feedback zu Studentenlösungen:

- Formatierte Anzeige des Feedbacks
- Rating-Möglichkeit für Studierende

### EditorTabsComponent

Verwaltet mehrere geöffnete Dateien als Tabs:

- Anzeige von Tabs für geöffnete Dateien
- Datei-spezifische Icons basierend auf dem Dateityp
- Schließen-Funktion für Tabs

### FileExplorerComponent

Zeigt die Projektstruktur in einem Baum an:

- Ist standardmäßig eingeklappt, um mehr Platz für den Editor zu bieten
- Toggle-Button zum Ein-/Ausklappen des Explorers (oben rechts im Header)
- Reduzierte Breite von 220px im ausgeklappten und 24px im eingeklappten Zustand
- Ordner-Hierarchie mit auf-/zuklappbaren Ordnern
- Datei-Icons basierend auf dem Dateityp
- Öffnen von Dateien im Editor durch Klick

## Services

### FileSystemService

Verwaltet das virtuelle Dateisystem:

- Trennung zwischen allen Dateien und geöffneten Tabs
- Laden und Speichern von Dateien aus Aufgaben
- Bearbeiten und Schließen von Dateien
- VSCode-ähnliches Verhalten beim Tab-Management

### WorkspaceStateService

Zentraler Service für das State-Management:

- Lädt Aufgaben vom Server
- Verwaltet den aktuellen Zustand des Arbeitsbereichs
- Sendet Code-Submissions und empfängt Ergebnisse
- Verwaltet die Feedback-Generierung

## Datenmodelle und Datenfluss

Die wichtigsten Datenmodelle im `code-submission.model.ts`:

- `CodeSubmissionResultDto`: Ergebnis einer Code-Submission
- `TestResult`: Ergebnis eines einzelnen Unit-Tests
- `WorkspaceState`: Enum für den aktuellen Zustand des Arbeitsbereichs
- `FeedbackRating`: Bewertung des Feedbacks durch Studierende

### Backend-Frontend Datenmodelle

**Wichtig für neue Entwickler**: Das Backend und Frontend verwenden unterschiedliche Schlüsselnamen für Testdaten:

```typescript
// Backend-Format der Testresultate
{
  "test": "test_durchschnitt (test_main.TestFussballStatistik.test_durchschnitt)",
  "status": "FAILED",
  "exception": "..."
}

// Frontend-Format (TestResult Interface)
{
  name: string;      // statt "test"
  passed: boolean;   // statt "status"
  exception?: string;
}
```

Die Transformation erfolgt im `WorkspaceStateService.executeCode()`. Die Testresultate werden dort automatisch von Backend- zu Frontend-Format konvertiert.

## Integration in den Workflow

1. Student wählt eine Aufgabe
2. WorkspaceStateService lädt die Aufgabe
3. StudentWorkspaceComponent zeigt Aufgabe und Editor
4. Student schreibt Code und führt ihn aus
5. CodeEditorWrapperComponent sendet den Code an den Server
6. Die Ergebnisse werden in TerminalOutputComponent angezeigt
7. TestIndicators zeigen die Testergebnisse an
8. FeedbackPanel zeigt KI-generiertes Feedback

## UI-Anpassungen und Verhalten

- **File Explorer**: 
  - Ist standardmäßig eingeklappt (Variable `isExplorerCollapsed` in FileExplorerComponent und StudentWorkspaceComponent)
  - Der Button zum Ein-/Ausklappen befindet sich im rechten Bereich und bleibt auch im eingeklappten Zustand sichtbar
  - Im eingeklappten Zustand nimmt der Explorer nur 24px Breite ein
  - Im ausgeklappten Zustand beträgt die Breite 220px für optimale Übersicht

- **Responsives Layout**:
  - Das Layout passt sich dynamisch an, wenn der File Explorer ein- oder ausgeklappt wird
  - Die Komponenten sind so gestaltet, dass sie auf verschiedenen Bildschirmgrößen und -orientierungen gut funktionieren

## Erweiterung und Best Practices

Beim Hinzufügen neuer Funktionen, bitte folgende Richtlinien beachten:

1. Komponentenbasierte Architektur beibehalten
2. State-Management über den WorkspaceStateService
3. Reaktives Programmiermodell mit RxJS
4. Responsive Design für alle Bildschirmgrößen
5. Zugänglichkeit (a11y) berücksichtigen

### Typische Fallstricke und Lösungen

1. **Backend-/Frontend-Datenmodelle**: 
   - Immer prüfen, ob Backend-Datenfelder in den Frontend-Modellen anders benannt sind
   - Transformationslogik in die Services legen, nicht in Komponenten

2. **Komplexe Testnamen**:
   - Verschiedene Programmiersprachen haben unterschiedliche Testnamensformate
   - Verwende `getShortTestName()` für benutzerfreundliche Anzeigen
   - Bewahre den Originalnamen für Debugging-Zwecke auf (z.B. als Tooltip)

3. **TypeScript Type Guards**:
   - Verwende Type Guards für komplexe Datenstrukturen, besonders bei Dialogen:
   ```typescript
   private isDataWithAllTests(data: any): data is TestDetailsDialogData {
     return 'allTests' in data || 'isListView' in data;
   }
   ```

4. **WorkspaceState Management**:
   - Verwende die definierten WorkspaceState-Enums für Zustandsverwaltung
   - Halte dich an den reaktiven Ansatz mit BehaviorSubjects/Observables
   - Ändere den State nur im WorkspaceStateService

5. **Editor Fokus-Probleme**:
   - Verwende das `isLocalUpdate` Flag im CodeEditorWrapper, um zirkuläre Updates zu vermeiden
   - Bei Editor-Einbindung immer an Fokus-Management denken
   - Trenne lokale von externen Änderungen, um Fokusverlust zu vermeiden

## Abhängigkeiten

- Angular Material für UI-Komponenten
- ngx-monaco-editor-v2 für den Code-Editor
- RxJS für reaktive Programmierung
