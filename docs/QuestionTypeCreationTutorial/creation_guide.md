# Anleitung: Erstellung eines neuen Fragetyps

Dieses Dokument beschreibt den schrittweisen Prozess zur Implementierung eines neuen Fragetyps in der HEFL-Plattform. Es dient als Leitfaden für Entwickler und LLMs und konzentriert sich darauf, **welche** Dateien und Methoden angepasst werden müssen.

---

## Phase 1: Backend-Implementierung

### Schritt 1.1: Datenbank-Schema erweitern

Zuerst muss das Datenmodell für den neuen Fragetyp definiert werden.

-   **Wo:** `server_nestjs/prisma/schema.prisma`
-   **Was:**
    1.  Füge ein neues Model für deinen Fragetyp hinzu (z.B. `model MyNewQuestionType { ... }`).
    2.  Stelle sicher, dass das neue Model eine Relation zum `Question`-Model hat (normalerweise über eine `questionId`).
    3.  Falls der Fragetyp spezifische Benutzerantworten speichert, erstelle auch ein entsprechendes Model (z.B. `UserMyNewAnswer`) und verknüpfe es mit dem `UserAnswer`-Model.

### Schritt 1.2: Data Transfer Objects (DTOs) definieren

DTOs stellen die Datenstruktur für die Kommunikation zwischen Backend und Frontend sicher.

-   **Wo:** `shared/dtos/`
-   **Was:**
    1.  **Enum erweitern:** Füge in `question.dto.ts` einen neuen Eintrag zum `questionType`-Enum hinzu (z.B. `MYTYPE = "MyNewQuestionType"`).
    2.  **Basis-DTO erstellen:** Erstelle in `question.dto.ts` ein Interface für die Basis-Daten deines Fragetyps (z.B. `myNewQuestionTypeDTO`).
    3.  **Detaillierte DTO erstellen:** Erstelle in `detailedQuestion.dto.ts` ein Interface für die detaillierten Daten (z.B. `detailedMyNewQuestionTypeDTO`).
    4.  **Haupt-DTO erweitern:** Füge in `detailedQuestion.dto.ts` dein neues DTO als optionale Eigenschaft zum `detailedQuestionDTO`-Interface hinzu (z.B. `myNewQuestion?: detailedMyNewQuestionTypeDTO;`).
    5.  **Antwort-DTO erweitern (optional):** Falls spezifische Antwortdaten anfallen, erweitere in `userAnswer.dto.ts` das `UserAnswerDataDTO`-Interface (z.B. `userMyNewAnswer?: MyNewAnswerDTO;`).

### Schritt 1.3: Dedizierten Service erstellen (Empfohlen)

Für eine saubere Architektur sollte jeder Fragetyp seinen eigenen Service für CRUD-Operationen haben.

-   **Wo:** `server_nestjs/src/question-data/`
-   **Was:**
    1.  Erstelle einen neuen Ordner (z.B. `question-data-mynewtype`).
    2.  Darin eine neue Service-Datei (z.B. `question-data-mynewtype.service.ts`).
    3.  Implementiere Methoden wie `create...`, `update...` und `get...` für deinen Fragetyp.

### Schritt 1.4: Haupt-Service (`QuestionDataService`) integrieren

Der `QuestionDataService` ist der zentrale Orchestrator.

-   **Wo:** `server_nestjs/src/question-data/question-data.service.ts`
-   **Was:**
    1.  **Service injizieren:** Importiere und injiziere deinen neuen, dedizierten Service im `constructor`.
    2.  **`getDetailedQuestion` anpassen:** Erweitere das `switch`-Statement um einen `case` für deinen neuen `questionType`, um die spezifischen Daten zu laden.
    3.  **`updateWholeQuestion` anpassen:** Erweitere das `switch`-Statement, um die `create...`- und `update...`-Methoden deines dedizierten Services aufzurufen.
    4.  **`detailedQuestionsUpdateable` anpassen:** Füge dein neues DTO zur `if`-Bedingung hinzu.

### Schritt 1.5: Bewertungslogik implementieren (`createUserAnswer`)

Dies ist der wichtigste Schritt für die Funktionalität und variiert je nach Komplexität des Fragetyps.

-   **Wo:** `server_nestjs/src/question-data/question-data.service.ts` in der Methode `createUserAnswer`.
-   **Was:** Füge einen `if (question.type === questionType.MYTYPE)`-Block hinzu und implementiere die passende Logik:

    -   **Szenario A: Einfache, regelbasierte Bewertung** (z.B. Upload-Aufgabe)
        -   Prüfe die Benutzerantwort gegen feste Regeln (z.B. wurde eine Datei hochgeladen?).
        -   Verwende ggf. andere Services (z.B. `ProductionFilesService` für Datei-Uploads).
        -   Berechne den `userScore` und erstelle direkt ein `Feedback`-Objekt.

    -   **Szenario B: KI-gestütztes Feedback** (z.B. Freitext-Aufgabe)
        -   **Frage:** Benötigt die Antwort eine semantische Analyse durch eine KI?
        -   **Falls ja:** Rufe den `FeedbackGenerationService` auf (z.B. `generateFreetextFeedback`). Du musst diesen Service ggf. um eine Methode für deinen neuen Fragetyp erweitern.
        -   Verarbeite die KI-Antwort, um `userScore` und `feedbackText` zu bestimmen.

    -   **Szenario C: Komplexe, benutzerdefinierte Auswertung** (z.B. Graphen-Aufgabe)
        -   **Frage:** Erfordert die Auswertung eine komplexe, spezifische Logik?
        -   **Falls ja:** Erstelle einen eigenen Evaluierungs-Service (z.B. `MyNewTypeEvaluationService`) und rufe dessen Methoden hier auf, um die Antwort zu bewerten.

---

## Phase 2: Frontend-Implementierung

### Schritt 2.1: Edit-Dialog für Dozenten erstellen

Dozenten benötigen eine Oberfläche, um die spezifischen Eigenschaften deines Fragetyps zu erstellen und zu bearbeiten.

-   **Wo:** `client_angular/src/app/pages/lecturersView/`
-   **Was:**
    1.  Erstelle eine neue Komponente für den Edit-Dialog (z.B. `edit-mynewtype/edit-mynewtype.component.ts`).
    2.  Diese Komponente sollte ein `FormGroup` enthalten, um die spezifischen Felder deines Fragetyps zu verwalten.
    3.  Beim Speichern sollte die Komponente den `QuestionDataService` aufrufen, um die Änderungen via `updateWholeQuestion` zu persistieren.

### Schritt 2.2: Task-Komponente für Studierende erstellen

Studierende benötigen eine Oberfläche, um die Aufgabe zu bearbeiten.

-   **Wo:** `client_angular/src/app/pages/contentView/contentElement/`
-   **Was:**
    1.  Erstelle eine neue Komponente für die Aufgabenansicht (z.B. `mynewtype-task/mynewtype-task.component.ts`).
    2.  Diese Komponente zeigt die Aufgabenstellung an und sammelt die Eingaben des Studierenden.
    3.  Beim Absenden ruft sie die `createUserAnswer`-Methode des `QuestionDataService` auf und verarbeitet das zurückgegebene Feedback.

### Schritt 2.3: Integration in die Content-Liste

Der neue Fragetyp muss in der Liste der Inhaltselemente korrekt dargestellt und verlinkt werden.

-   **Wo:** `client_angular/src/app/pages/content-list/content-list-item/content-list-item.component.ts`
-   **Was:**
    1.  **`getQuestionTypeReadable`:** Füge einen `case` für deinen `questionType` hinzu, um einen lesbaren Namen zurückzugeben.
    2.  **`getQuestionTypeIcon`:** Füge einen `case` hinzu, um ein passendes Material-Icon zuzuordnen.
    3.  **`onTaskEdit`:** Erweitere den `switch`, um bei Klick auf "Bearbeiten" deinen neuen `EditMyNewType`-Dialog zu öffnen.
    4.  **`onTaskClick`:** Erweitere den `switch`, um bei Klick auf die Aufgabe deine neue `MyNewTypeTask`-Komponente (als Dialog oder per Routing) zu öffnen.
    5.  **`onTaskGrading` (optional):** Falls dein Fragetyp eine manuelle Bewertung erfordert, implementiere diese Methode, um zur Bewertungsansicht zu navigieren.

### Schritt 2.4: Integration in den Erstellungs-Dialog

Dozenten müssen den neuen Fragetyp beim Erstellen eines neuen Inhaltselements auswählen können.

-   **Wo:** `client_angular/src/app/pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.html`
-   **Was:** Füge eine neue `<mat-option>` für deinen `questionType` im Dropdown-Menü für den Fragentyp hinzu.

---

## Zusammenfassende Checkliste

**Backend (`server_nestjs`):**
-   [ ] `prisma/schema.prisma`
-   [ ] `shared/dtos/question.dto.ts`
-   [ ] `shared/dtos/detailedQuestion.dto.ts`
-   [ ] `shared/dtos/userAnswer.dto.ts` (optional)
-   [ ] `src/question-data/question-data-mynewtype/question-data-mynewtype.service.ts` (empfohlen)
-   [ ] `src/question-data/question-data.service.ts`

**Frontend (`client_angular`):**
-   [ ] `src/app/pages/lecturersView/edit-mynewtype/` (neue Komponente)
-   [ ] `src/app/pages/contentView/contentElement/mynewtype-task/` (neue Komponente)
-   [ ] `src/app/pages/content-list/content-list-item/content-list-item.component.ts`
-   [ ] `src/app/pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.html`
