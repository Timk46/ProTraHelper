# Plan: Implementierung des KTC (Knowledge about Task Constraints) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge about Task Constraints" (KTC) im `LanggraphFeedbackService`. Dieser Knoten gibt Hinweise zu spezifischen Anforderungen, Regeln oder Einschränkungen der Programmieraufgabe, die für die korrekte Lösung relevant sind.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KTC-Feedback-Methode:**
    *   Name: z.B. `generateKtcFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt (z.B. wenn die Lösung zwar funktioniert, aber eine spezifische Anforderung wie die Verwendung von Rekursion oder das Verbot bestimmter Bibliotheken missachtet).
    *   Input: Der aktuelle Langgraph-State (mindestens `taskDescription: string`, `studentSolution: string`, `questionId: number`). Benötigt Zugriff auf detaillierte Aufgabeninformationen/Metadaten.
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KTC-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KTC = "..."`).

2.  **Logik innerhalb der KTC-Feedback-Methode:**
    *   **Datenextraktion:** `taskDescription`, `studentSolution`, `questionId` aus dem State extrahieren.
    *   **Aufgaben-Metadaten abrufen:** Zugriff auf detaillierte Informationen zur Aufgabe mit `questionId` (z.B. über `PrismaService`). Diese Informationen sollten explizite Einschränkungen enthalten (z.B. "Muss rekursiv gelöst werden", "Keine externen Bibliotheken verwenden", "Bestimmte Funktion muss implementiert werden"). Wenn keine spezifischen Einschränkungen für die Aufgabe definiert sind, kann dieser Knoten kein Feedback generieren.
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM erstellen. Dieser enthält die Aufgabenstellung (`taskDescription`), die expliziten Einschränkungen (aus den Metadaten) und die `studentSolution`.
    *   **LLM-Call:**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KTC-Prompt (siehe Punkt 3). Der LLM prüft, ob die Lösung die Einschränkungen erfüllt und generiert ggf. einen Hinweis.
    *   **Antwort-Generierung:** Der LLM generiert Feedback, das auf relevante Einschränkungen hinweist, falls diese von der Lösung nicht beachtet wurden.
    *   **State-Aktualisierung:** Das generierte Feedback (oder eine leere Zeichenkette, falls keine relevanten Einschränkungen verletzt wurden) im State unter `generatedFeedbacks.KTC` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KTC-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/ktc.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein aufmerksamer Informatik-Tutor. Deine Aufgabe ist es zu prüfen, ob die Lösung eines Studenten spezifische Anforderungen oder Einschränkungen der Aufgabe erfüllt, und ggf. darauf hinzuweisen."
        *   **Kontext:** Platzhalter für `taskDescription`, `taskConstraints` (die expliziten Einschränkungen der Aufgabe), `studentSolution`.
        *   **Anweisungen:**
            *   "Analysiere die `studentSolution` daraufhin, ob sie alle in `taskConstraints` genannten Anforderungen und Einschränkungen erfüllt."
            *   "Wenn eine oder mehrere Einschränkungen NICHT erfüllt sind, formuliere einen freundlichen Hinweis, der den Studenten auf die spezifische(n) Einschränkung(en) aufmerksam macht. Beispiel: 'Denke daran, dass diese Aufgabe explizit mit Rekursion gelöst werden soll.' oder 'Achte darauf, dass du nur die erlaubten Standardbibliotheken verwendest.'"
            *   "Wenn alle Einschränkungen erfüllt sind, gib KEINEN Text zurück (oder eine spezielle Markierung wie '[[NO_KTC_FEEDBACK]]')."
            *   "Gib keine Hinweise zur allgemeinen Korrektheit oder zu Fehlern, konzentriere dich NUR auf die Einhaltung der expliziten `taskConstraints`."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge 2-3 Beispiele hinzu:
            *   Input (Constraint: "rekursiv", Lösung: iterativ) -> Output (Hinweis auf Rekursion).
            *   Input (Constraint: "keine `vector`-Bibliothek", Lösung: verwendet `vector`) -> Output (Hinweis auf verbotene Bibliothek).
            *   Input (Constraint: "rekursiv", Lösung: rekursiv) -> Output ("[[NO_KTC_FEEDBACK]]").

4.  **Abhängigkeiten:**
    *   `@langchain/openai`
    *   Interner State-Management-Mechanismus.
    *   Zugriff auf detaillierte Aufgaben-Metadaten/Einschränkungen (z.B. via `PrismaService`). Die Struktur dieser Metadaten muss definiert sein.

5.  **Testing:**
    *   Unit-Tests für `generateKtcFeedback`:
        *   Mocking des LLM-Calls und des Datenbankzugriffs für Aufgaben-Metadaten.
        *   Testen des Abrufs der Einschränkungen.
        *   Testen mit Lösungen, die Einschränkungen verletzen -> Erwartet spezifischen Hinweis.
        *   Testen mit Lösungen, die alle Einschränkungen erfüllen -> Erwartet kein Feedback (oder die spezielle Markierung).
        *   Testen des Fallbacks, wenn keine Einschränkungen für die Aufgabe definiert sind.
        *   Überprüfen, ob der Prompt korrekt formatiert wird.
        *   Überprüfen, ob der State korrekt aktualisiert wird.