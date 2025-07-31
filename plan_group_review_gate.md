# Finaler Plan: Group Review Gate

Basierend auf unserer Diskussion, hier der detaillierte Plan zur Implementierung des neuen Aufgabentyps "Bewertungs-Übersicht" (`GROUP_REVIEW_GATE`).

---

## Phase 1: Backend (`server_nestjs`)

### 1.1: Datenbank (`prisma/schema.prisma`)

-   **Neues Model erstellen:** Ein neues Model `GroupReviewGate` wird hinzugefügt.
-   **Felder definieren:**
    -   `questionId`: Stellt die 1-zu-1-Beziehung zum `Question`-Model her.
    -   `linkedQuestionId`: Speichert die ID der `upload-question`, die vom Dozenten als Basis für den Review-Prozess ausgewählt wird.

### 1.2: Data Transfer Objects (DTOs) (`shared/dtos`)

-   **`question.dto.ts`:**
    -   Das `questionType`-Enum wird um den neuen Typ `GROUP_REVIEW_GATE = "GroupReviewGate"` erweitert.
-   **`detailedQuestion.dto.ts`:**
    -   Ein neues Interface `groupReviewGateDTO` wird erstellt, das die `linkedQuestionId` enthält.
    -   Das `detailedQuestionDTO` wird um die optionale Eigenschaft `groupReviewGate?: groupReviewGateDTO` erweitert.
    -   Eine weitere Eigenschaft `groupReviewStatuses?: GroupReviewStatusDTO[]` wird hinzugefügt, um die Statusinformationen für das Frontend bereitzustellen.
-   **`groupReviewStatus.dto.ts` (Neue Datei):**
    -   Diese Datei wird neu erstellt, um das `GroupReviewStatusDTO` zu definieren.
    -   **Dummy-Struktur:**
        -   `submissionIdentifier`: Ein anonymer Bezeichner (z.B. "Abgabe A").
        -   `reviewPhase`: Die aktuelle Phase des Reviews (z.B. "Phase 1: Feedback geben").
        -   `userStatus`: Der Fortschritt des aktuellen Users für diese Abgabe (z.B. "erledigt" oder "offen").

### 1.3: Services (`src/`)

-   **Neuer dedizierter Service (`question-data-groupreviewgate.service.ts`):**
    -   Dieser Service kapselt die Logik für den neuen Fragetyp.
    -   Er enthält `create`- und `update`-Methoden, um die `linkedQuestionId` zu verwalten.
-   **Anpassung des Haupt-Services (`question-data.service.ts`):**
    -   **`getDetailedQuestion`:** Für den `case GROUP_REVIEW_GATE` wird eine Logik implementiert, die:
        1.  Die Gruppenmitglieder des anfragenden Users ermittelt.
        2.  Die zugehörigen Abgaben aus der `linkedQuestionId` findet.
        3.  Für jede Abgabe ein Dummy-`GroupReviewStatusDTO` erstellt.
        4.  Die gesammelten Status-DTOs an das Frontend zurückgibt.
    -   **`updateWholeQuestion`:** Ruft die `update`-Methode des neuen, dedizierten Services auf.
    -   **`createUserAnswer`:** Wird für diesen Fragetyp nicht erweitert, da keine direkte Bewertung stattfindet.

---

## Phase 2: Frontend (`client_angular`)

### 2.1: Dozentenansicht (`lecturersView`)

-   **Neue Edit-Seite (`edit-group-review-gate.component.ts`):**
    -   Es wird eine vollwertige Editier-Seite für Dozenten erstellt.
    -   Kernstück ist ein Dropdown-Menü, das alle `upload-question`-Aufgaben des Kurses zur Auswahl anbietet.
    -   Beim Speichern wird `updateWholeQuestion` aufgerufen, um die `linkedQuestionId` im Backend zu persistieren.
-   **Anpassung des Erstellungs-Dialogs (`create-content-element-dialog.component.html`):**
    -   Eine neue `<mat-option>` wird hinzugefügt, damit Dozenten "Bewertungs-Übersicht" als Fragetyp auswählen können.

### 2.2: Studentenansicht (`contentView`)

-   **Neuer Dialog (`group-review-gate-dialog.component.ts`):**
    -   Für die Studentenansicht wird eine neue Komponente als Dialog implementiert.
    -   Der Dialog zeigt die vom Backend gelieferten `groupReviewStatuses` in einer übersichtlichen Tabelle an.
    -   **Tabellenstruktur:** `| Abgabe | Status | Aktion |`
    -   **Beispielzeile:** `| Abgabe A | Phase 1: Feedback erledigt | [Button "Zur Abgabe"] |`
    -   Der "Zur Abgabe"-Button wird implementiert, hat aber vorerst noch keine Navigationsfunktion.

### 2.3: Integration in die Content-Liste (`content-list-item.component.ts`)

-   Die `switch`-Statements in dieser Komponente werden erweitert, um den neuen Typ zu behandeln:
    -   **`getQuestionTypeReadable`:** Gibt "Bewertungs-Übersicht" zurück.
    -   **`getQuestionTypeIcon`:** Weist ein passendes Icon zu (z.B. `fact_check`).
    -   **`onTaskEdit`:** Leitet den Dozenten zur neuen `edit-group-review-gate`-Seite weiter.
    -   **`onTaskClick`:** Öffnet den `group-review-gate-dialog` für den Studenten.
