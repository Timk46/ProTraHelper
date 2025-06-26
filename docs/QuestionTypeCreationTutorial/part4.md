## Schritt 4: Frontend - Angular Service und Edit-Dialog

### 4.1 Angular Service erweitern

In `client_angular/src/app/Services/question/question-data.service.ts`:

#### 4.1.1 Import erweitern
```typescript
import {
  // ...existing imports...
  uploadQuestionDTO
} from '@DTOs/index';

import { EditUploadComponent } from 'src/app/Pages/lecturersView/edit-upload/edit-upload.component';
```

#### 4.1.2 Service-Methoden hinzufügen
```typescript
/**
 * Retrieves upload question data for a specific question version.
 * @param {number} questionVersionId - The version ID of the question.
 * @returns {Observable<uploadQuestionDTO>} An Observable that emits the uploadQuestionDTO.
 */
getUploadQuestion(questionVersionId: number) : Observable<uploadQuestionDTO> {
  return this.http.get<uploadQuestionDTO>(environment.server + `/question-data/uploadQuestion/${questionVersionId}`);
}

/**
 * Creates a new upload question.
 * @param {uploadQuestionDTO} uploadQuestion - The upload question data to create
 * @returns {Observable<uploadQuestionDTO>} An Observable that emits the created uploadQuestionDTO
 */
createUploadQuestion(uploadQuestion: uploadQuestionDTO) : Observable<uploadQuestionDTO> {
  return this.http.post<uploadQuestionDTO>(environment.server + `/question-data/createUploadQuestion`, uploadQuestion)
}

/**
 * Opens a dialog for editing upload questions.
 * @param {object} data - Dialog data containing questionId and mode
 * @returns {MatDialogRef<EditUploadComponent>} The dialog reference
 */
openUploadEditDialog(data: { questionId?: number; detailedQuestion?: detailedQuestionDTO; mode: 'create' | 'edit' }): MatDialogRef<EditUploadComponent> {
  return this.dialog.open(EditUploadComponent, {
    width: '600px',
    data: data,
    disableClose: false
  });
}
```

#### 4.1.3 openDialog Methode erweitern
```typescript
openDialog(taskType: string, config: MatDialogConfig): MatDialogRef<McTaskComponent | FreeTextTaskComponent | FillinTaskNewComponent | EditUploadComponent> | undefined {
  switch (taskType) {
    // ...existing cases...
    case questionType.UPLOAD:
      return this.dialog.open(EditUploadComponent, { ...config, width: '600px' });
    default:
      console.warn(`No dialog defined for task type: ${taskType}`);
      return undefined;
  }
}
```
### 4.2 Edit-Upload Dialog Komponente

#### 4.2.1 Component TypeScript (`edit-upload.component.ts`)
```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { detailedQuestionDTO, detailedUploadQuestionDTO, questionType } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

interface EditUploadDialogData {
  questionId?: number;
  detailedQuestion?: detailedQuestionDTO;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-edit-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './edit-upload.component.html',
  styleUrl: './edit-upload.component.scss'
})
export class EditUploadComponent implements OnInit {
  uploadForm: FormGroup;
  mode: 'create' | 'edit';
  isSaving = false;

  // Vordefinierte Optionen
  fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc,docx', label: 'Word Dokument' },
    { value: 'jpg,jpeg,png', label: 'Bild (JPG, PNG)' },
    { value: 'zip', label: 'ZIP Archiv' },
    { value: 'txt', label: 'Text Datei' },
    { value: '*', label: 'Alle Dateitypen' }
  ];

  fileSizes = [
    { value: 1, label: '1 MB' },
    { value: 5, label: '5 MB' },
    { value: 10, label: '10 MB' },
    { value: 25, label: '25 MB' },
    { value: 50, label: '50 MB' },
    { value: 100, label: '100 MB' }
  ];

  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EditUploadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditUploadDialogData
  ) {
    this.mode = data.mode;
    
    this.uploadForm = this.fb.group({
      title: ['', Validators.required],
      text: ['', Validators.required],
      textHTML: [''],
      maxSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      fileType: ['*', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.mode === 'edit' && this.data.detailedQuestion?.uploadQuestion) {
      this.setFormData(this.data.detailedQuestion.uploadQuestion);
    }
  }

  private setFormData(uploadQuestion: detailedUploadQuestionDTO): void {
    this.uploadForm.patchValue({
      title: uploadQuestion.title,
      text: uploadQuestion.text,
      textHTML: uploadQuestion.textHTML,
      maxSize: uploadQuestion.maxSize / (1024 * 1024), // Convert bytes to MB
      fileType: uploadQuestion.fileType
    });
  }

  onSave(): void {
    if (this.uploadForm.valid) {
      this.isSaving = true;
      
      const uploadQuestionData: detailedUploadQuestionDTO = {
        ...this.uploadForm.value,
        questionId: this.data.questionId || this.data.detailedQuestion?.id,
        maxSize: this.uploadForm.value.maxSize * 1024 * 1024 // Convert MB to bytes
      };

      if (this.mode === 'edit' && this.data.detailedQuestion?.uploadQuestion?.id) {
        uploadQuestionData.id = this.data.detailedQuestion.uploadQuestion.id;
      }
      
      this.dialogRef.close(uploadQuestionData);
    } else {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus.', 'Schließen', {
        duration: 3000
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
```

#### 4.2.2 Component Template (`edit-upload.component.html`)
```html
<div mat-dialog-content class="upload-dialog">
  <h2 mat-dialog-title>
    {{ mode === 'create' ? 'Upload-Frage erstellen' : 'Upload-Frage bearbeiten' }}
  </h2>

  <form [formGroup]="uploadForm" class="upload-form">
    <!-- Titel -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Titel</mat-label>
      <input matInput formControlName="title" placeholder="Titel der Upload-Aufgabe">
      <mat-error *ngIf="uploadForm.get('title')?.hasError('required')">
        Titel ist erforderlich
      </mat-error>
    </mat-form-field>

    <!-- Aufgabenbeschreibung -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Aufgabenbeschreibung</mat-label>
      <textarea 
        matInput 
        formControlName="text" 
        placeholder="Beschreiben Sie, was die Studierenden hochladen sollen..."
        rows="4">
      </textarea>
      <mat-error *ngIf="uploadForm.get('text')?.hasError('required')">
        Aufgabenbeschreibung ist erforderlich
      </mat-error>
    </mat-form-field>

    <!-- Dateityp-Auswahl -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Erlaubte Dateitypen</mat-label>
      <mat-select formControlName="fileType">
        <mat-option *ngFor="let type of fileTypes" [value]="type.value">
          {{ type.label }}
        </mat-option>
      </mat-select>
      <mat-hint>Wählen Sie die erlaubten Dateiformate für den Upload</mat-hint>
      <mat-error *ngIf="uploadForm.get('fileType')?.hasError('required')">
        Dateityp ist erforderlich
      </mat-error>
    </mat-form-field>

    <!-- Dateigröße -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Maximale Dateigröße</mat-label>
      <mat-select formControlName="maxSize">
        <mat-option *ngFor="let size of fileSizes" [value]="size.value">
          {{ size.label }}
        </mat-option>
      </mat-select>
      <mat-hint>Maximale Größe pro hochgeladener Datei</mat-hint>
      <mat-error *ngIf="uploadForm.get('maxSize')?.hasError('required')">
        Maximale Dateigröße ist erforderlich
      </mat-error>
    </mat-form-field>

    <!-- Zusätzliche HTML-Inhalte (optional) -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Zusätzliche HTML-Inhalte (optional)</mat-label>
      <textarea 
        matInput 
        formControlName="textHTML" 
        placeholder="Zusätzliche formatierte Inhalte oder Hinweise..."
        rows="3">
      </textarea>
      <mat-hint>Erweiterte Formatierung möglich (HTML)</mat-hint>
    </mat-form-field>
  </form>
</div>

<div mat-dialog-actions align="end" class="dialog-actions">
  <button mat-button (click)="onCancel()" [disabled]="isSaving">
    Abbrechen
  </button>
  <button 
    mat-raised-button 
    color="primary" 
    (click)="onSave()" 
    [disabled]="isSaving || uploadForm.invalid">
    <span *ngIf="isSaving">Speichern...</span>
    <span *ngIf="!isSaving">{{ mode === 'create' ? 'Erstellen' : 'Speichern' }}</span>
  </button>
</div>
```

#### 4.2.3 Component Styles (`edit-upload.component.scss`)
```scss
.upload-dialog {
  width: 500px;
  max-width: 90vw;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.full-width {
  width: 100%;
}

.dialog-actions {
  padding: 16px 0;
  gap: 8px;
}

h2 {
  margin: 0 0 16px 0;
  color: #333;
  font-weight: 500;
}

// Button styling
button[mat-raised-button] {
  min-width: 100px;
}

// Textarea styling
textarea {
  resize: vertical;
  min-height: 60px;
}
```

### 4.3 Features des Edit-Dialogs

#### 4.3.1 Eingabefelder
- **Titel**: Titel der Upload-Aufgabe (Pflichtfeld)
- **Beschreibung**: Anweisungen für Studierende (Pflichtfeld)
- **Dateityp**: Dropdown mit vordefinierten Optionen (PDF, Word, Bilder, ZIP, etc.)
- **Dateigröße**: Dropdown mit MB-Werten (1-100 MB)
- **HTML-Inhalt**: Optional für erweiterte Formatierung

#### 4.3.2 Validierung
- **Pflichtfelder**: Titel, Beschreibung, Dateityp, Dateigröße
- **Dateigröße**: Min 1 MB, Max 100 MB
- **Form-Validation**: Angular Reactive Forms mit Error Messages
- **Real-time Feedback**: Sofortige Validierung beim Eingeben

#### 4.3.3 Dialog-Modi
- **Create**: Neue Upload-Frage erstellen (leere Form)
- **Edit**: Bestehende Upload-Frage bearbeiten (vorgefüllte Form)
- **Responsive**: Adaptive Breite (600px, max 90vw für Mobile)

### 4.4 Verwendung des Dialogs

```typescript
// Dialog öffnen für neue Upload-Frage
const dialogRef = this.questionDataService.openUploadEditDialog({
  questionId: 123,
  mode: 'create'
});

dialogRef.afterClosed().subscribe(result => {
  if (result) {
    // Upload-Frage wurde erstellt/gespeichert
    console.log('Upload Question Data:', result);
    // Weitere Verarbeitung der Daten...
  }
});

// Dialog öffnen für bestehende Upload-Frage
const editDialogRef = this.questionDataService.openUploadEditDialog({
  detailedQuestion: existingQuestion,
  mode: 'edit'
});

editDialogRef.afterClosed().subscribe(result => {
  if (result) {
    // Upload-Frage wurde aktualisiert
    this.updateQuestion(result);
  }
});
```

### 4.5 Integration in bestehende Workflows

#### 4.5.1 Lecturer Dashboard Integration
```typescript
// In der Lecturer-Komponente
onCreateUploadQuestion() {
  const dialogRef = this.questionDataService.openUploadEditDialog({
    mode: 'create',
    questionId: this.currentQuestionId
  });

  dialogRef.afterClosed().subscribe(uploadData => {
    if (uploadData) {
      this.createWholeQuestion(uploadData);
    }
  });
}

onEditUploadQuestion(question: detailedQuestionDTO) {
  const dialogRef = this.questionDataService.openUploadEditDialog({
    mode: 'edit',
    detailedQuestion: question
  });

  dialogRef.afterClosed().subscribe(uploadData => {
    if (uploadData) {
      this.updateWholeQuestion(uploadData);
    }
  });
}
```

#### 4.5.2 Question-Type Selector Integration
```typescript
// Im Question-Type Selector
if (selectedType === questionType.UPLOAD) {
  this.questionDataService.openUploadEditDialog({
    mode: 'create',
    questionId: this.questionId
  }).afterClosed().subscribe(result => {
    if (result) {
      this.handleQuestionCreated(result);
    }
  });
}
```

### 4.6 Wichtige Design-Entscheidungen

#### 4.6.1 Dialog vs. Page
- **Dialog gewählt**: Wenige Einstellungen rechtfertigen keine eigene Seite
- **Kompakt**: Fokussierte Benutzeroberfläche ohne Ablenkung
- **Modal**: Verhindert unvollständige Eingaben durch Seitenwechsel

#### 4.6.2 Standalone Component
- **Moderne Angular-Architektur**: Bessere Isolierung und Wiederverwendbarkeit
- **Tree-shaking**: Nur benötigte Module werden geladen
- **Performance**: Reduzierte Bundle-Größe

#### 4.6.3 Reactive Forms
- **Robuste Validierung**: Type-safe Form-Handling
- **State Management**: Einfache Verwaltung von Form-Zuständen
- **Error Handling**: Benutzerfreundliche Fehlermeldungen

### 4.7 Wichtige Implementierungsdetails

#### 4.7.1 TypeScript Interfaces
```typescript
interface EditUploadDialogData {
  questionId?: number;
  detailedQuestion?: detailedQuestionDTO;
  mode: 'create' | 'edit';
}
```
- **Type Safety**: Verhindert Laufzeitfehler durch falsche Dialog-Daten
- **IDE Support**: Autocomplete und Refactoring-Unterstützung

#### 4.7.2 Material Design Integration
- **Konsistente UI**: Folgt dem bestehenden Design-System
- **Accessibility**: Material Components sind WCAG-konform
- **Responsive**: Automatische Anpassung an verschiedene Bildschirmgrößen

#### 4.7.3 Error Handling
```typescript
// Beispiel für robustes Error Handling
onSave(): void {
  if (this.uploadForm.valid) {
    // ... Speicher-Logik
  } else {
    this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus.', 'Schließen', {
      duration: 3000
    });
  }
}
```

### 4.8 Testing Considerations

#### 4.8.1 Unit Tests
```typescript
// create-content-element-dialog.component.spec.ts
describe('CreateContentElementDialogComponent', () => {
  it('should include UPLOAD option in question types', () => {
    const component = TestBed.createComponent(CreateContentElementDialogComponent).componentInstance;
    expect(component.questionTypes.UPLOAD).toBe('UploadQuestion');
  });

  it('should validate upload question creation', () => {
    const component = TestBed.createComponent(CreateContentElementDialogComponent).componentInstance;
    component.creationForm.patchValue({
      questionType: questionType.UPLOAD,
      questionTitle: 'Test Upload',
      questionScore: 0 // Invalid score
    });
    
    component.onSubmit();
    
    // Should show error for invalid score
    expect(component.creationForm.valid).toBeFalsy();
  });
});
```

#### 4.8.2 E2E Tests
```typescript
// e2e/upload-question-creation.e2e-spec.ts
describe('Upload Question Creation Workflow', () => {
  it('should create upload question through complete workflow', async () => {
    // 1. Open create dialog
    await page.click('[data-testid="add-question-button"]');
    
    // 2. Select upload type
    await page.selectOption('[formControlName="questionType"]', 'UploadQuestion');
    
    // 3. Fill basic data
    await page.fill('[formControlName="questionTitle"]', 'Test Upload Question');
    await page.selectOption('[formControlName="questionDifficulty"]', '3');
    await page.fill('[formControlName="questionScore"]', '100');
    
    // 4. Submit basic form
    await page.click('button:has-text("Erstellen")');
    
    // 5. Configure upload details
    await page.fill('[formControlName="text"]', 'Upload your homework file');
    await page.selectOption('[formControlName="fileType"]', 'pdf');
    await page.selectOption('[formControlName="maxSize"]', '10');
    
    // 6. Save upload configuration
    await page.click('button:has-text("Erstellen")');
    
    // 7. Verify question was created
    await expect(page.locator('.question-list')).toContainText('Test Upload Question');
  });
});
```

### 4.9 Finale Integration Checkliste

- ✅ **HTML Template erweitert** mit Upload-Option im Dropdown
- ✅ **TypeScript Component** verwendet bereits korrektes questionType Enum
- ✅ **Workflow definiert** für vollständige Upload-Fragen-Erstellung
- ✅ **Error Handling** für robuste Benutzerexperience
- ✅ **Service Integration** in openDialog Methode
- ✅ **Datenfluss dokumentiert** von Dialog bis Backend
- ✅ **Testing Strategy** für Unit und E2E Tests
- ✅ **Validierung implementiert** für Upload-spezifische Regeln

---