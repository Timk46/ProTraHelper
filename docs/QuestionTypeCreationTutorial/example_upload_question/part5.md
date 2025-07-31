## Schritt 5: Integration in den Create-Content-Element-Dialog

### 5.1 Übersicht

Der `create-content-element-dialog` ist der zentrale Einstiegspunkt für die Erstellung neuer Fragen. Er muss erweitert werden, damit Dozenten den neuen Upload-Fragetyp auswählen können.

### 5.2 HTML Template erweitern

**Datei:** `client_angular/src/app/Pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.html`

In dem Fragentyp-Dropdown wird die Upload-Option hinzugefügt:

```html
<mat-form-field appearance="outline">
  <mat-label>Typ</mat-label>
  <mat-select placeholder="Fragentyp" formControlName="questionType">
    <mat-option [value]="questionTypes.FREETEXT">Freitext</mat-option>
    <mat-option [value]="questionTypes.SINGLECHOICE">Single Choice</mat-option>
    <mat-option [value]="questionTypes.MULTIPLECHOICE">Multiple Choice</mat-option>
    <mat-option [value]="questionTypes.FILLIN">Lückentext</mat-option>
    <mat-option [value]="questionTypes.CODE">Programmieraufgabe</mat-option>
    <mat-option [value]="questionTypes.UML">UML</mat-option>
    <mat-option value="GraphQuestion">Graphen</mat-option>
    <mat-option [value]="questionTypes.CODEGAME">Programmierspiel</mat-option>
    <mat-option [value]="questionTypes.UPLOAD">Upload-Aufgabe</mat-option> <!-- NEU -->
  </mat-select>
  <mat-error *ngIf="creationForm.get('questionType')!.hasError('required')">
    Fragentyp ist erforderlich
  </mat-error>
</mat-form-field>
```

### 5.3 TypeScript Component (`create-content-element-dialog.component.ts`)

Die TypeScript-Komponente ist bereits korrekt konfiguriert und stellt das `questionType`-Enum für das Template bereit.

```typescript
import { questionType } from '@DTOs/question.dto';

@Component({
  // ...
})
export class CreateContentElementDialogComponent {
  questionTypes = questionType; // Enum wird bereits importiert und verfügbar gemacht
  
  // ... rest der Komponente
}
```

### 5.4 Vereinfachter Workflow

Der Workflow für die Erstellung von Upload-Fragen wurde vereinfacht. Der `create-content-element-dialog` sammelt alle notwendigen Informationen in einem Schritt. Es gibt keinen nachfolgenden Dialog zur weiteren Konfiguration mehr.

1.  **Dialog öffnen**: Ein Dozent klickt auf "Frage hinzufügen".
2.  **Typ auswählen**: Der Dozent wählt "Upload-Aufgabe" aus dem Dropdown.
3.  **Daten eingeben**: Der Dozent füllt alle erforderlichen Felder aus (Titel, Schwierigkeit, Punkte, etc.).
4.  **Dialog schließen und erstellen**: Nach dem Absenden werden die Daten an die aufrufende Komponente übergeben, die dann den `createQuestion`-Endpunkt im `QuestionDataService` aufruft.

Der `EditUploadComponent` wird nur noch zum Bearbeiten einer *bereits existierenden* Upload-Frage verwendet und ist nicht mehr Teil des Erstellungsprozesses.

---

**Status:** ✅ Backend Service ✅ Hauptservice Integration ✅ createUserAnswer ✅ Frontend Edit-Dialog (aktualisiert) ✅ Create-Dialog Integration (aktualisiert)
**Nächster Schritt:** Content List Item Integration (siehe `part6.md`)

---
