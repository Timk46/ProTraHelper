# Anleitung: Hinzufügen eines neuen Aufgabentyps (Fragetyp) zur Lernplattform

VORSICHT: AI GENERIERT UND MÖGLICHERWEISE UNVOLLSTÄNDIG / IRREFÜHREND
Diese Anleitung beschreibt alle notwendigen Schritte, um einen neuen Fragetyp (z.B. "Drag&Drop", "Matching", etc.) in die HEFL-Lernplattform zu integrieren. Sie umfasst Backend, Frontend, Datenbank (Prisma) und Feedback-Logik.

---

## 1. Datenbank: Prisma Schema anpassen

- **Prisma-Modell erweitern:**
  - Lege ein neues Modell für den Fragetyp in `server_nestjs/prisma/schema.prisma` an (analog zu `MCQuestion`, `FreeTextQuestion`, etc.).
  - Füge ggf. neue Felder zu bestehenden Modellen hinzu (z.B. zu `Question`, `UserAnswer`).
  - Beispiel:
    ```prisma
    model DragDropQuestion {
      id           Int      @id @default(autoincrement())
      questionId   Int      @unique
      ... // weitere spezifische Felder
      question     Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
    }
    ```
- **Migration durchführen:**
  - Führe eine neue Migration durch, um die Änderungen in die Datenbank zu übernehmen.

---

## 2. Backend: NestJS erweitern

### a) DTOs anlegen/erweitern
- Lege neue DTOs für den Fragetyp in `shared/dtos/` an (analog zu `McQuestionDTO`, `FreeTextQuestionDTO`, etc.).
- Exportiere sie in `shared/dtos/index.ts`.

### b) Service und Controller
- Lege einen neuen Service im Backend an, z.B. `question-data-dragdrop.service.ts` in `server_nestjs/src/question-data/`.
- Implementiere Methoden zum Erstellen, Abrufen, Bewerten und Feedback für den neuen Fragetyp.
- Binde den Service im Haupt-`QuestionDataService` und im `QuestionDataController` ein:
  - Konstruktor erweitern
  - Endpunkte für den neuen Fragetyp hinzufügen (analog zu MC, Freitext, etc.)
- Beispiel:
  ```typescript
  @Get('/dragDropQuestion/:questionId')
  async getDragDropQuestion(@Param('questionId') questionId: number): Promise<DragDropQuestionDTO> {
    return this.qdDragDropService.getDragDropQuestion(questionId);
  }
  ```

### c) Feedback- und Bewertungslogik
- Implementiere die Feedback-Logik im neuen Service oder in `FeedbackGenerationService`.
- Stelle sicher, dass die Bewertung und das Feedback im UserAnswer/Feedback-Modell gespeichert werden.

### d) UserAnswer-Handling
- Passe die Speicherung der Nutzerantworten an (ggf. neues Feld/Modell in Prisma und Service).
- Implementiere die Auswertung und Speicherung der Abgabe.

---

## 3. Frontend: Angular erweitern

### a) DTOs und Typen
- Lege neue DTOs/Interfaces für den Fragetyp in `shared/dtos/` an und exportiere sie.
- Importiere sie im Frontend, z.B. in `question-data.service.ts` und Komponenten.

### b) Service-Erweiterung
- Erweitere `question-data.service.ts` um Methoden für den neuen Fragetyp (Abruf, Abgabe, Feedback).
- Beispiel:
  ```typescript
  getDragDropQuestion(questionId: number): Observable<DragDropQuestionDTO> {
    return this.http.get<DragDropQuestionDTO>(environment.server + `/question-data/dragDropQuestion/${questionId}`);
  }
  ```

### c) Dynamische Anzeige
- Erweitere die Logik in `dynamic-question.component.ts`, damit der neue Fragetyp korrekt erkannt und die passende Komponente geladen wird.
- Beispiel:
  ```typescript
  switch (type) {
    case questionType.DRAGDROP:
      // Komponente laden
      break;
    // ...
  }
  ```

### d) Neue Komponente
- Lege eine neue Angular-Komponente für die Aufgabenansicht und -abgabe an (z.B. `drag-drop-task.component.ts`).
- Implementiere die UI, die Abgabe und das Feedbackhandling.

### e) Routing
- Falls nötig, passe das Routing an, damit der Fragetyp direkt aufgerufen werden kann.

---

## 4. Bestehende Funktionen und Enums erweitern

- **Enums:**
  - Erweitere `questionType`-Enum und ggf. andere relevante Enums um den neuen Typ.
- **ContentElementType:**
  - Falls der Fragetyp als ContentElement eingebunden wird, passe das Enum `contentElementType` an.
- **DTOs:**
  - Ergänze alle DTOs, die eine Liste von Fragetypen enthalten.
- **Testfälle:**
  - Schreibe Unit- und Integrationstests für Backend und Frontend.

---

## 5. Abgabestruktur und Feedback

- **Abgabe:**
  - Implementiere im Backend einen Endpunkt zur Entgegennahme und Auswertung der Nutzerantwort.
  - Im Frontend: Sende die Antwort über den Service an das Backend.
- **Feedback:**
  - Backend: Generiere Feedback (automatisch oder manuell) und speichere es.
  - Frontend: Zeige das Feedback nach Abgabe an.

---

## 6. Zusammenfassung: Checkliste

- [ ] Prisma-Modell und Migration
- [ ] Neue DTOs (Backend & Frontend)
- [ ] Backend-Service und Controller
- [ ] Feedback- und Bewertungslogik
- [ ] UserAnswer-Handling
- [ ] Frontend-Service und Komponente
- [ ] Dynamic-Loader erweitern
- [ ] Routing (falls nötig)
- [ ] Enums und DTOs ergänzen
- [ ] Tests schreiben

---

**Tipp:** Orientiere dich an bestehenden Fragetypen wie Multiple Choice, Freitext, Fill-In, Graph, Code usw. und übertrage die Struktur auf den neuen Typ. Prüfe, ob der neue Typ spezielle Anforderungen an Bewertung oder Feedback hat und passe die Logik entsprechend an.

Für Details siehe auch die Dateien und Services zu bestehenden Fragetypen im Projekt.
