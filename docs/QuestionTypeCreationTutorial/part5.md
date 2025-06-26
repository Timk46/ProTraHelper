## Schritt 5: Integration in den Create-Content-Element-Dialog

### 5.1 Übersicht

Der `create-content-element-dialog` ist der zentrale Einstiegspunkt für die Erstellung neuer Fragen. Er muss erweitert werden, damit Dozenten den neuen Upload-Fragetyp auswählen können.

### 5.2 HTML Template erweitern

**Datei:** `client_angular/src/app/Pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.html`

In dem Fragentyp-Dropdown die Upload-Option hinzufügen:

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

### 5.3 TypeScript Component (bereits korrekt)

**Datei:** `client_angular/src/app/Pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.ts`

Die TypeScript-Komponente ist bereits korrekt konfiguriert:

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
Das `questionTypes` Enum enthält bereits `UPLOAD = "UploadQuestion"` aus der DTO-Definition.

### 5.4 Workflow Integration

#### 5.4.1 Dialog Rückgabe-Verarbeitung

Der Dialog gibt die Form-Daten zurück, die dann von der aufrufenden Komponente verarbeitet werden:

```typescript
// Beispiel in einer übergeordneten Komponente
const dialogRef = this.dialog.open(CreateContentElementDialogComponent, {
  data: { /* initial data */ }
});

dialogRef.afterClosed().subscribe(result => {
  if (result && result.questionType === questionType.UPLOAD) {
    // Upload-Frage wurde ausgewählt
    this.handleUploadQuestionCreation(result);
  }
});

private handleUploadQuestionCreation(formData: any) {
  // Öffne den Upload-Edit Dialog für weitere Konfiguration
  const uploadDialogRef = this.dialog.open(EditUploadComponent, {
    width: '600px',
    data: {
      mode: 'create',
      questionId: formData.questionId
    },
    disableClose: false
  });

  uploadDialogRef.afterClosed().subscribe(uploadData => {
    if (uploadData) {
      // Kombiniere Basis-Frage-Daten mit Upload-spezifischen Daten
      const completeQuestionData = {
        ...formData,
        uploadQuestion: uploadData
      };
      
      // Erstelle die vollständige Frage
      this.createCompleteQuestion(completeQuestionData);
    }
  });
}
```

#### 5.4.2 Question-Service Integration

Der QuestionDataService hat bereits die notwendigen CRUD-Methoden für Upload-Fragen:

```typescript
// In question-data.service.ts - bereits implementiert
createUploadQuestion(uploadQuestion: uploadQuestionDTO): Observable<uploadQuestionDTO> {
  return this.http.post<uploadQuestionDTO>(environment.server + `/question-data/createUploadQuestion`, uploadQuestion)
}

getUploadQuestion(questionVersionId: number): Observable<uploadQuestionDTO> {
  return this.http.get<uploadQuestionDTO>(environment.server + `/question-data/uploadQuestion/${questionVersionId}`);
}
```

**Wichtig:** 
- Die `openDialog()` Methode wird **NICHT** für Upload-Fragen erweitert, da Upload-Fragen keine interaktiven Student-Dialoge haben
- Upload-Fragen werden stattdessen direkt in der `content-list-item` Komponente verwaltet
- Für Studenten: Kein Dialog wird geöffnet (nur Anzeige der Aufgabe)
- Für Admins: Separater Edit-Dialog direkt über `this.dialog.open(EditUploadComponent, ...)`

### 5.5 Vollständiger Workflow

#### 5.5.1 Schritt-für-Schritt Ablauf

1. **Dialog öffnen**: Dozent klickt auf "Frage hinzufügen"
2. **Typ auswählen**: Dozent wählt "Upload-Aufgabe" aus dem Dropdown
3. **Basis-Daten eingeben**: Titel, Schwierigkeit, Punkte, etc.
4. **Dialog schließen**: Basis-Daten werden an Parent-Komponente zurückgegeben
5. **Upload-Dialog öffnen**: Parent-Komponente öffnet automatisch Upload-Edit-Dialog
6. **Upload-Details konfigurieren**: Aufgabenbeschreibung, Dateityp, Dateigröße
7. **Upload-Dialog schließen**: Upload-spezifische Daten werden zurückgegeben
8. **Frage erstellen**: Vollständige Frage wird an Backend gesendet

#### 5.5.2 Datenfluss-Diagramm

```
CreateContentElementDialog
           ↓ (basic question data)
    ParentComponent
           ↓ (questionType === UPLOAD)
    EditUploadComponent
           ↓ (upload-specific data)
    ParentComponent
           ↓ (combined data)
    Backend API
           ↓ (complete question)
    Database
```

### 5.6 Error Handling und Validierung

#### 5.6.1 Validierung im Create-Dialog

```typescript
// Erweiterte Validierung für Upload-Fragen
onSubmit(): void {
  if (this.activeTab === 'new') {
    if (this.creationForm.valid) {
      const formData = this.creationForm.value;
      
      // Spezielle Validierung für Upload-Fragen
      if (formData.questionType === questionType.UPLOAD) {
        // Zusätzliche Upload-spezifische Validierungen
        if (!formData.questionScore || formData.questionScore < 1) {
          this.snackBar.open('Upload-Fragen benötigen mindestens 1 Punkt', 'Schließen');
          return;
        }
      }
      
      this.dialogRef.close(formData);
    } else {
      this.creationForm.markAllAsTouched();
    }
  }
  // ... existing connection form logic
}
```

#### 5.6.2 Fehlerbehandlung im Workflow

```typescript
private handleUploadQuestionCreation(formData: any) {
  try {
    const uploadDialogRef = this.dialog.open(EditUploadComponent, {
      width: '600px',
      data: {
        mode: 'create',
        questionId: formData.questionId
      },
      disableClose: false
    });

    uploadDialogRef.afterClosed().subscribe({
      next: (uploadData) => {
        if (uploadData) {
          this.createCompleteQuestion({
            ...formData,
            uploadQuestion: uploadData
          });
        }
      },
      error: (error) => {
        console.error('Error in upload dialog:', error);
        this.snackBar.open('Fehler beim Konfigurieren der Upload-Frage', 'Schließen');
      }
    });
  } catch (error) {
    console.error('Error opening upload dialog:', error);
    this.snackBar.open('Upload-Dialog konnte nicht geöffnet werden', 'Schließen');
  }
}
```

### 5.7 Testing und Qualitätssicherung

#### 5.7.1 Unit Tests

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

#### 5.7.2 E2E Tests
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

### 5.8 Finale Integration Checkliste

- ✅ **HTML Template erweitert** mit Upload-Option im Dropdown
- ✅ **TypeScript Component** verwendet bereits korrektes questionType Enum
- ✅ **Workflow definiert** für vollständige Upload-Fragen-Erstellung
- ✅ **Error Handling** für robuste Benutzerexperience
- ✅ **Service Integration** bereits implementiert mit separaten Upload-Methoden
- ✅ **Datenfluss dokumentiert** von Dialog bis Backend
- ✅ **Testing Strategy** für Unit und E2E Tests
- ✅ **Validierung implementiert** für Upload-spezifische Regeln

**Wichtige Erkenntnisse:**
- Upload-Fragen verwenden **separate Dialog-Methoden** (`openUploadEditDialog`)
- Upload-Fragen werden **NICHT** in die `openDialog()` Methode integriert
- Student-Interaktion erfolgt über **separate Upload-Interfaces**, nicht über Standard-Task-Dialoge

---

**Status:** ✅ Backend Service ✅ Hauptservice Integration ✅ createUserAnswer ✅ Frontend Edit-Dialog ✅ Create-Dialog Integration  
**Nächster Schritt:** Content List Item Integration (siehe part6.md)

---