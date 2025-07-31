# Schritt 6: Content List Item Integration

### 6.1 Übersicht

Die `content-list-item` Komponente ist für die Darstellung und Interaktion mit Aufgaben in der Content-Liste verantwortlich. Sie muss erweitert werden, um Upload-Fragen korrekt anzuzeigen, zu bearbeiten, zu bewerten und von Studenten bearbeiten zu lassen.

### 6.2 Icon und Bezeichnung hinzufügen

**Datei:** `client_angular/src/app/pages/content-list/content-list-item/content-list-item.component.ts`

Die Methoden `getQuestionTypeReadable` und `getQuestionTypeIcon` werden um den `UPLOAD`-Typ erweitert.

```typescript
getQuestionTypeReadable(type: string | undefined): string {
  switch (type) {
    // ... andere Fälle
    case questionType.UPLOAD:
      return 'Upload-Aufgabe'; // NEU
    default:
      return 'Aufgabe';
  }
}

getQuestionTypeIcon(type: string | undefined): string {
  switch (type) {
    // ... andere Fälle
    case questionType.UPLOAD:
      return 'cloud_upload'; // NEU
    default:
      return 'help';
  }
}
```

### 6.3 Bearbeitung von Upload-Fragen (`onTaskEdit`)

Die `onTaskEdit`-Methode öffnet den `EditUploadComponent` direkt, um eine bestehende Upload-Frage zu bearbeiten.

```typescript
onTaskEdit() {
  if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
  const question: taskViewDTO = this.contentElementData.question;
  switch (question.type) {
    // ... andere Fälle
    case questionType.UPLOAD:
      const dialogRef = this.dialog.open(EditUploadComponent, {
        width: '600px',
        data: {
          questionId: question.id,
          detailedQuestion: this.contentElementData.question,
          mode: 'edit'
        },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.snackBar.open('Upload-Aufgabe aktualisiert', 'OK', { duration: 3000 });
        }
      });
      break;
  }
}
```

### 6.4 Student-Interaktion (`onTaskClick`)

Für Studenten öffnet die `onTaskClick`-Methode die `UploadTaskComponent`, in der sie ihre Dateien hochladen können.

```typescript
onTaskClick() {
  // ...
  switch (question.type) {
    // ... andere Fälle
    case questionType.UPLOAD:
      dialogRef = this.dialog.open(UploadTaskComponent, {...dialogConfig, width: '70vw'});
      break;
  }
  // ...
}
```

### 6.5 Dozenten-Bewertung (`onTaskGrading`)

Eine neue Methode `onTaskGrading` ermöglicht es Dozenten, zur Bewertungsübersicht für eine bestimmte Upload-Aufgabe zu navigieren.

```typescript
onTaskGrading(){
  if (!this.contentElementData.question || !this.editModeButtonsClickable) return;
  const question: taskViewDTO = this.contentElementData.question;
  // Navigate to grading overview
  this.router.navigate(['/lecturer/grading/uploads', question.id]);
}
```

### 6.6 Wichtige Punkte

- **Drei Hauptinteraktionen:** Die Komponente unterstützt jetzt das Bearbeiten (`onTaskEdit`), das Bearbeiten durch Studenten (`onTaskClick`) und das Bewerten (`onTaskGrading`) von Upload-Fragen.
- **Neue Komponente:** Die `UploadTaskComponent` ist die neue Schnittstelle für Studenten zum Hochladen von Dateien.
- **Grading-Workflow:** Es gibt einen neuen Workflow für Dozenten, um die eingereichten Arbeiten zu bewerten.

---

**Status:** ✅ Backend Service ✅ Hauptservice Integration ✅ createUserAnswer ✅ Frontend Edit-Dialog (aktualisiert) ✅ Create-Dialog Integration (aktualisiert) ✅ Content List Item Integration (aktualisiert)
**Nächster Schritt:** Student Upload Interface und File Handling implementieren (siehe `part7.md`)

---