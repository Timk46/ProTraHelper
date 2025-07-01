# Schritt 6: Content List Item Integration

### 6.1 Übersicht

Die `content-list-item` Komponent    case questionType.UPLOAD: // NEU
      // Upload Edit Dialog direkt öffnen (NICHT über questionDataService)
      const dialogRef = this.dialog.open(EditUploadComponent, {
        width: '600px',
        data: {
          questionId: question.id,
          mode: 'edit'
        },
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Upload question updated:', result);
          // Optional: Content refresh oder Success-Message
          this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
        }
      });
      break;tlich für die Darstellung und Interaktion mit Aufgaben in der Content-Liste. Sie muss erweitert werden, um Upload-Fragen korrekt anzuzeigen und zu bearbeiten.

### 6.2 Icon und Bezeichnung hinzufügen

**Datei:** `client_angular/src/app/Pages/content-list/content-list-item/content-list-item.component.ts`

#### 6.2.1 Lesbare Bezeichnung

```typescript
getQuestionTypeReadable(type: string | undefined): string {
  switch (type) {
    case questionType.MULTIPLECHOICE:
      return 'Multiple Choice';
    case questionType.SINGLECHOICE:
      return 'Single Choice';
    case questionType.FREETEXT:
      return 'Freitext';
    case questionType.FILLIN:
      return 'Lückentext';
    case questionType.CODE:
      return 'Programmieraufgabe';
    case questionType.GRAPH:
      return 'Graphaufgabe';
    case questionType.UML:
      return 'UML-Aufgabe';
    case questionType.CODEGAME:
      return 'Codegame';
    case questionType.UPLOAD:
      return 'Upload-Aufgabe'; // NEU
    default:
      return 'Aufgabe';
  }
}
```

#### 6.2.2 Icon-Zuordnung

```typescript
getQuestionTypeIcon(type: string | undefined): string {
  switch (type) {
    case questionType.MULTIPLECHOICE:
      return 'list';
    case questionType.SINGLECHOICE:
      return 'radio_button_checked';
    case questionType.FREETEXT:
      return 'text_fields';
    case questionType.FILLIN:
      return 'short_text';
    case questionType.CODE:
      return 'code';
    case questionType.GRAPH:
      return 'device_hub';
    case questionType.UML:
      return 'account_tree';
    case questionType.CODEGAME:
      return 'videogame_asset';
    case questionType.UPLOAD:
      return 'cloud_upload'; // NEU
    default:
      return 'help';
  }
}
```

### 6.3 Bearbeitung von Upload-Fragen

#### 6.3.1 Edit-Funktionalität in onTaskEdit()

```typescript
onTaskEdit() {
  if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
  const question: taskViewDTO = this.contentElementData.question;
  switch (question.type) {
    case questionType.SINGLECHOICE:
    case questionType.MULTIPLECHOICE:
      this.router.navigate(['/editchoice/', question.id]);
      break;
    case questionType.FREETEXT:
      this.router.navigate(['/editfreetext/', question.id]);
      break;
    case questionType.FILLIN:
      console.log("FILLIN");
      this.router.navigate(['/editfillin/', question.id]);
      break;
    case questionType.CODE:
      this.router.navigate(['/editcoding/', question.id]);
      break;
    case questionType.GRAPH:
      this.router.navigate(['/editgraph/', question.id]);
      break;
    case questionType.UML:
      this.router.navigate(['/edituml/', question.id]);
      break;
    case questionType.CODEGAME:
      this.router.navigate(['/editcodegame/', question.id]);
      break;
    case questionType.UPLOAD: // NEU
      // Open upload edit dialog directly
      const dialogRef = this.questionDataService.openUploadEditDialog({
        questionId: question.id,
        mode: 'edit'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('Upload question updated:', result);
          // Optionally refresh the content or show success message
          this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
        }
      });
      break;
  }
}
```

**Wichtige Designentscheidung:** 
- Upload-Fragen verwenden **keinen** Service-basierten Dialog-Opener
- Der Dialog wird direkt über `this.dialog.open(EditUploadComponent, ...)` geöffnet
- Dies ist bewusst so gestaltet, da Upload-Fragen eine eigene Dialog-Logik haben

### 6.4 Student-Interaktion

#### 6.4.1 onTaskClick() - Keine spezielle Behandlung nötig

Upload-Fragen benötigen **keine** spezielle Behandlung in der `onTaskClick()` Methode, da:

- Upload-Fragen sind **keine interaktiven Dialog-Aufgaben** für Studenten
- Studenten sehen nur die Aufgabenbeschreibung (kein Dialog wird geöffnet)
- Upload-Funktionalität wird über separate Upload-Komponenten bereitgestellt

```typescript
onTaskClick() {
  console.log("Task clicked");
  if (!this.contentElementData.question) return;
  const question: taskViewDTO = this.contentElementData.question;
  
  // ... existing code ...
  
  switch (question.type) {
    case questionType.SINGLECHOICE:
    case questionType.MULTIPLECHOICE:
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
      break;
    case questionType.FREETEXT:
      dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
      break;
    // ... other cases ...
    
    // WICHTIG: Kein case für questionType.UPLOAD!
    // Upload-Fragen haben keine direkte Student-Interaktion über Dialoge
  }
  
  // ... existing dialog handling code ...
}
```

### 6.5 UI/UX Überlegungen

#### 6.5.1 Visual Feedback für Upload-Fragen

Upload-Fragen sollten in der Content-Liste visuell unterscheidbar sein:

- **Icon:** `cloud_upload` vermittelt die Upload-Funktionalität
- **Bezeichnung:** "Upload-Aufgabe" ist selbsterklärend
- **Verhalten:** Kein Klick-Verhalten für Studenten (kein Dialog öffnet sich)

#### 6.5.2 Admin-spezifische Features

Nur für Administratoren/Dozenten:
- **Edit-Button:** Öffnet Upload-Edit-Dialog
- **Delete-Button:** Standard-Löschfunktionalität
- **Position-Buttons:** Standard-Positionierung

### 6.6 Fehlerbehandlung

#### 6.6.1 Dialog-Fehlerbehandlung

```typescript
case questionType.UPLOAD:
  try {
    const dialogRef = this.questionDataService.openUploadEditDialog({
      questionId: question.id,
      mode: 'edit'
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          console.log('Upload question updated:', result);
          this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('Error updating upload question:', error);
        this.snackBar.open('Fehler beim Aktualisieren der Upload-Aufgabe', 'OK', { duration: 3000 });
      }
    });
  } catch (error) {
    console.error('Error opening upload edit dialog:', error);
    this.snackBar.open('Upload-Dialog konnte nicht geöffnet werden', 'OK', { duration: 3000 });
  }
  break;
```

### 6.7 Testing

#### 6.7.1 Unit Tests

```typescript
// content-list-item.component.spec.ts
describe('ContentListItemComponent Upload Integration', () => {
  it('should return correct readable name for upload questions', () => {
    const component = TestBed.createComponent(ContentListItemComponent).componentInstance;
    expect(component.getQuestionTypeReadable(questionType.UPLOAD)).toBe('Upload-Aufgabe');
  });

  it('should return correct icon for upload questions', () => {
    const component = TestBed.createComponent(ContentListItemComponent).componentInstance;
    expect(component.getQuestionTypeIcon(questionType.UPLOAD)).toBe('cloud_upload');
  });

  it('should open upload edit dialog directly on upload question edit', () => {
    const component = TestBed.createComponent(ContentListItemComponent).componentInstance;
    const dialogSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(true)
    });
    component.dialog.open = dialogSpy;
    
    component.contentElementData = {
      question: { id: 1, type: questionType.UPLOAD }
    };
    component.editModeButtonsClickable = true;
    
    component.onTaskEdit();
    
    // Verify dialog was opened directly (not through service)
    expect(dialogSpy).toHaveBeenCalledWith(EditUploadComponent, {
      width: '600px',
      data: {
        questionId: 1,
        mode: 'edit'
      },
      disableClose: false
    });
  });

  it('should not handle upload questions in onTaskClick', () => {
    const component = TestBed.createComponent(ContentListItemComponent).componentInstance;
    const dialogSpy = jasmine.createSpy('open');
    component.dialog.open = dialogSpy;
    
    component.contentElementData = {
      question: { id: 1, type: questionType.UPLOAD }
    };
    
    component.onTaskClick();
    
    // Verify no dialog was opened for upload questions
    expect(dialogSpy).not.toHaveBeenCalled();
  });
});
```

### 6.8 Finale Integration Checkliste

- ✅ **getQuestionTypeReadable()** erweitert um Upload-Aufgabe
- ✅ **getQuestionTypeIcon()** erweitert um cloud_upload Icon
- ✅ **onTaskEdit()** implementiert Upload-Edit-Dialog-Öffnung
- ✅ **onTaskClick()** bewusst NICHT erweitert (korrekt!)
- ✅ **Fehlerbehandlung** für Dialog-Operationen
- ✅ **UI/UX Überlegungen** dokumentiert
- ✅ **Testing Strategy** definiert

---

**Status:** ✅ Backend Service ✅ Hauptservice Integration ✅ createUserAnswer ✅ Frontend Edit-Dialog ✅ Create-Dialog Integration ✅ Content List Item Integration  
**Nächster Schritt:** Student Upload Interface und File Handling implementieren

---
