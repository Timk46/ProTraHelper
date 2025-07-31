# Part 7: Student Upload Interface (`UploadTaskComponent`)

## Übersicht

Die `UploadTaskComponent` ist die Schnittstelle für Studierende, um Dateien für eine Upload-Aufgabe einzureichen. Sie bietet eine moderne Benutzeroberfläche mit Drag & Drop, Dateivorschau, Validierung und einer Fortschrittsanzeige für den Upload.

## Komponentenlogik (`upload-task.component.ts`)

Die Logik der Komponente umfasst die folgenden Hauptfunktionen:

- **Datenabruf:** Lädt die Details der Upload-Aufgabe beim Initialisieren.
- **Datei-Handling:** Beinhaltet Methoden für Drag & Drop (`onDragOver`, `onDragLeave`, `onDrop`) und die manuelle Dateiauswahl (`onFileSelected`).
- **Validierung:** Überprüft, ob die ausgewählte Datei den Anforderungen an Dateityp und -größe entspricht.
- **Upload-Prozess:** Konvertiert die Datei in einen Base64-String und sendet sie über den `QuestionDataService` an das Backend. Zeigt den Fortschritt des Uploads an.
- **Feedback:** Gibt dem Benutzer über Snackbars Feedback zum Erfolg oder Misserfolg des Uploads.

```typescript
// ... (Auszug aus upload-task.component.ts)
export class UploadTaskComponent {
  // ... (Properties für File-Handling, Upload-Status etc.)

  constructor(
    public dialogRef: MatDialogRef<UploadTaskComponent>,
    private questionService: QuestionDataService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // ...
    this.questionService.getUploadQuestion(this.taskViewData.id).subscribe(data => {
      this.uploadQuestion = data;
      // ...
    });
  }

  private handleFile(file: File): boolean {
    // Validierung von Dateityp und -größe
    // ...
    this.selectedFile = file;
    return true;
  }

  async uploadFile() {
    if (!this.selectedFile || !this.uploadQuestion) return;

    this.isUploading = true;
    // ... (Base64-Konvertierung und Fortschrittsanzeige)

    const userAnswerData: UserAnswerDataDTO = {
      // ... (Vorbereitung der Antwort-DTO)
    };

    this.questionService.createUserAnswer(userAnswerData).subscribe({
      next: (data) => {
        // ... (Erfolgs-Handling)
      },
      error: (error) => {
        // ... (Fehlerbehandlung)
      }
    });
  }

  // ... (Hilfsmethoden für Dateigröße, Icons etc.)
}
```

## Template (`upload-task.component.html`)

Das Template ist in mehrere Bereiche unterteilt:

- **Header:** Zeigt den Titel der Aufgabe an.
- **Beschreibung:** Zeigt die Aufgabenstellung an.
- **Anforderungen:** Listet die erlaubten Dateitypen, die maximale Dateigröße und die erreichbaren Punkte auf.
- **Drag & Drop Zone:** Der Hauptinteraktionsbereich für den Datei-Upload. Zeigt je nach Zustand entweder die Upload-Aufforderung, eine Vorschau der ausgewählten Datei oder den Upload-Fortschritt an.
- **Aktions-Buttons:** Buttons zum Abbrechen oder Starten des Uploads.

```html
<!-- (Auszug aus upload-task.component.html) -->
<div class="upload-container" *ngIf="uploadQuestion">
  <!-- Header -->
  <div class="upload-header">
    <h2 class="upload-title">{{ uploadQuestion.title }}</h2>
  </div>

  <!-- Beschreibung -->
  <div class="description-section">
    <div class="description-text" [innerHTML]="uploadQuestion.textHTML || uploadQuestion.text"></div>
  </div>

  <!-- Anforderungen -->
  <div class="requirements-section">
    <!-- ... (Anforderungs-Karten) ... -->
  </div>

  <!-- Drag & Drop Zone -->
  <div class="drop-zone" [class.drag-over]="isDragOver">
    <!-- Vorschau der ausgewählten Datei -->
    <div class="file-info" *ngIf="selectedFile && !isUploading">
      <!-- ... (Details zur Datei) ... -->
    </div>

    <!-- Upload-Fortschritt -->
    <div class="upload-progress" *ngIf="isUploading">
      <!-- ... (Fortschrittsanzeige) ... -->
    </div>
  </div>

  <!-- Aktions-Buttons -->
  <div class="action-buttons">
    <button mat-button (click)="dialogRef.close()">Abbrechen</button>
    <button mat-raised-button color="primary" (click)="uploadFile()" [disabled]="!selectedFile || isUploading">
      Hochladen
    </button>
  </div>
</div>
```

## Styling (`upload-task.component.scss`)

Das Styling verwendet das Nord Theme und setzt auf ein klares, modernes Design mit folgenden Merkmalen:

- **Farbpalette:** Nutzt die Nord-Theme-Farben für Hintergründe, Texte und Akzente.
- **Visuelles Feedback:** Ändert das Aussehen der Drag & Drop Zone, wenn eine Datei darüber gezogen wird (`drag-over`).
- **Animationen:** Verwendet subtile Animationen für Hover-Effekte und eine animierte Fortschrittsanzeige.
- **Responsivität:** Passt sich an verschiedene Bildschirmgrößen an.

---

**Status:** ✅ Alle Teile des Tutorials wurden überprüft und aktualisiert.
**Tutorial abgeschlossen!**

---