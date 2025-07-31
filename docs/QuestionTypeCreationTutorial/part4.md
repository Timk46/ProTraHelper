## Schritt 4: Frontend - Angular Service und Edit-Dialog

Dieser Teil beschreibt den Angular Service und die Edit-Dialog-Komponente, die für das Bearbeiten von Upload-Fragen verantwortlich sind. Die Implementierung hat sich von der ursprünglichen Beschreibung entfernt.

### 4.1 Angular Service (`question-data.service.ts`)

Im `client_angular/src/app/services/question/question-data.service.ts` sind vor allem die folgenden Methoden für die Handhabung von Upload-Fragen relevant. Es gibt keine dedizierte `openUploadEditDialog`-Methode mehr.

```typescript
// ...

/**
 * Retrieves detailed question data for a given question ID and type.
 */
getDetailedQuestionData(questionId: number, questionType: questionType) : Observable<detailedQuestionDTO> {
  return this.http.post<detailedQuestionDTO>(environment.server + `/question-data/detailed`, { questionId, questionType });
}

/**
 * Updates all aspects of a question including associated data.
 */
updateWholeQuestion(question: detailedQuestionDTO) : Observable<detailedQuestionDTO> {
  return this.http.post<detailedQuestionDTO>(environment.server + `/question-data/updateWholeQuestion`, question)
}

/**
 * Retrieves all user upload answers for a specific question.
 */
getAllUserUploadAnswers(questionId: number, questionType?: questionType) : Observable<UserUploadAnswerListItemDTO[]> {
  return this.http.get<UserUploadAnswerListItemDTO[]>(environment.server + `/question-data/allUserUploadAnswers/${questionId}`);
}

// ...
```

### 4.2 Edit-Upload Dialog Komponente (`edit-upload.component.ts`)

Die `edit-upload.component.ts` ist eine "Standalone Component", die für das Bearbeiten von Upload-Fragen verwendet wird. Sie wird direkt aus anderen Komponenten aufgerufen (z.B. `content-list-item`).

#### 4.2.1 Logik der Komponente

Die Komponente lädt die Daten der Frage beim Initialisieren (`ngOnInit`) selbst, anstatt sie über den Dialog-`data`-Parameter zu erhalten. Nach dem Speichern ruft sie direkt den `updateWholeQuestion`-Endpunkt des `QuestionDataService` auf.

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { detailedQuestionDTO, detailedUploadQuestionDTO, questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
// ... other imports

interface EditUploadDialogData {
  questionId: number;
}

@Component({
  selector: 'app-edit-upload',
  standalone: true,
  // ... imports
  templateUrl: './edit-upload.component.html',
  styleUrl: './edit-upload.component.scss'
})
export class EditUploadComponent implements OnInit {

  detailedQuestion: detailedQuestionDTO | undefined;
  uploadForm: FormGroup;
  isSaving = false;

  // ... fileTypes and fileSizes arrays

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EditUploadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditUploadDialogData
  ) {
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      textHTML: [''],
      maxSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      fileType: ['*', Validators.required]
    });
  }

  ngOnInit(): void {
    // Daten werden direkt vom Service geladen
    this.questionDataService.getDetailedQuestionData(this.data.questionId, questionType.UPLOAD)
      .subscribe((data: detailedQuestionDTO) => {
        this.detailedQuestion = data;
        this.uploadForm.patchValue({
          title: data.name
        });
        if (this.detailedQuestion.uploadQuestion) {
          // Umrechnung von Bytes in MB für die Anzeige
          this.detailedQuestion.uploadQuestion.maxSize = Math.floor((data.uploadQuestion?.maxSize || 10) / 1024 / 1024);
          this.setFormData(this.detailedQuestion.uploadQuestion);
        }
    });
  }

  private setFormData(uploadQuestion: detailedUploadQuestionDTO): void {
    this.uploadForm.patchValue({
      title: uploadQuestion.title,
      text: uploadQuestion.text,
      textHTML: uploadQuestion.textHTML,
      maxSize: uploadQuestion.maxSize,
      fileType: uploadQuestion.fileType
    });
  }

  onSave(): void {
    if (this.uploadForm.valid && this.detailedQuestion) {
      this.isSaving = true;

      this.detailedQuestion.name = this.uploadForm.value.title;
      this.detailedQuestion.uploadQuestion = {
        ...this.detailedQuestion.uploadQuestion,
        ...this.uploadForm.value,
        // Umrechnung von MB in Bytes für die Speicherung
        maxSize: this.uploadForm.value.maxSize * 1024 * 1024,
      };

      // Direkter Aufruf des Update-Services
      this.questionDataService.updateWholeQuestion(this.detailedQuestion)
        .subscribe({
          next: () => {
            this.snackBar.open('Frage erfolgreich gespeichert!', 'Schließen', { duration: 3000 });
            this.isSaving = false;
          },
          error: (error) => {
            this.snackBar.open('Fehler beim Speichern der Frage: ' + error.message, 'Schließen', { duration: 3000 });
            this.isSaving = false;
          }
        });
    } else {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus.', 'Schließen', { duration: 3000 });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
```

#### 4.2.2 Component Template (`edit-upload.component.html`)

Das Template ist im Wesentlichen gleich geblieben, aber der Titel ist jetzt statisch "Upload-Frage bearbeiten", da es keinen "create"-Modus mehr gibt.

```html
<h2 mat-dialog-title style="margin-left: 15px; margin-right: 15px;">Upload-Frage bearbeiten</h2>

<div mat-dialog-content class="dialog-content">
  <form [formGroup]="uploadForm" class="upload-form">
    <!-- Title Field -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Titel</mat-label>
      <input matInput formControlName="title" placeholder="Titel der Upload-Aufgabe">
      <!-- ... error messages ... -->
    </mat-form-field>

    <!-- Description/Instructions Field -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Aufgabenbeschreibung</mat-label>
      <textarea
        matInput
        formControlName="text"
        placeholder="Beschreiben Sie, was die Studierenden hochladen sollen..."
        rows="4">
      </textarea>
      <!-- ... error messages ... -->
    </mat-form-field>

    <!-- File Type Selection -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Erlaubte Dateitypen</mat-label>
      <mat-select formControlName="fileType">
        <mat-option *ngFor="let type of fileTypes" [value]="type.value">
          {{ type.label }}
        </mat-option>
      </mat-select>
      <!-- ... hints and error messages ... -->
    </mat-form-field>

    <!-- File Size Limit -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Maximale Dateigröße</mat-label>
      <mat-select formControlName="maxSize">
        <mat-option *ngFor="let size of fileSizes" [value]="size.value">
          {{ size.label }}
        </mat-option>
      </mat-select>
      <!-- ... hints and error messages ... -->
    </mat-form-field>
  </form>
</div>

<div mat-dialog-actions class="dialog-actions">
  <button mat-button (click)="onCancel()" [disabled]="isSaving">
    Abbrechen
  </button>
  <button
    mat-raised-button
    color="primary"
    (click)="onSave()"
    [disabled]="isSaving || uploadForm.invalid">
    <span *ngIf="isSaving">Speichern...</span>
    <span *ngIf="!isSaving">Speichern</span>
  </button>
</div>
```

### 4.3 Wichtige Änderungen und Design-Entscheidungen

- **Entkopplung vom Erstellungsprozess:** Die `edit-upload`-Komponente ist nur noch für das *Bearbeiten* zuständig. Der Erstellungsprozess wird an anderer Stelle gehandhabt (siehe `part5.md`).
- **Eigenständige Datenbeschaffung:** Die Komponente ist für das Laden ihrer eigenen Daten verantwortlich, was sie modularer macht.
- **Direkte Service-Kommunikation:** Anstatt Daten an eine aufrufende Komponente zurückzugeben, kommuniziert der Dialog direkt mit dem Backend-Service, um die Änderungen zu speichern. Dies vereinfacht den Workflow in den aufrufenden Komponenten.
- **Kein "Create"-Modus:** Die Logik für das Erstellen einer neuen Upload-Frage wurde aus diesem Dialog entfernt.

---

**Status:** ✅ Backend Service ✅ Hauptservice Integration ✅ createUserAnswer ✅ Frontend Edit-Dialog (aktualisiert)
**Nächster Schritt:** Integration in den `Create-Content-Element-Dialog` (siehe `part5.md`)

---
