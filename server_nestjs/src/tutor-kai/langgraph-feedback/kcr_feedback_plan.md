# Plan: Implementierung des KCR (Knowledge of Correct Result) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge of Correct Result" (KCR) im `LanggraphFeedbackService`. Dieser Knoten beschreibt den korrekten Lösungsansatz oder hebt Schlüsselaspekte hervor, basierend auf einer Musterlösung, ohne jedoch den Code direkt preiszugeben.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KCR-Feedback-Methode:**
    *   Name: z.B. `generateKcrFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt (z.B. bei wiederholten Fehlversuchen oder gravierenden konzeptionellen Fehlern, die der Router erkennt).
    *   Input: Der aktuelle Langgraph-State (mindestens `taskDescription: string`, `studentSolution: string`, `questionId: number`, optional `generatedFeedbacks.KM: string`). Benötigt Zugriff auf die Musterlösung.
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KCR-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KCR = "..."`).

2.  **Logik innerhalb der KCR-Feedback-Methode:**
    *   **Datenextraktion:** `taskDescription`, `studentSolution`, `questionId`, `generatedFeedbacks.KM` (falls vorhanden) aus dem State extrahieren.
    *   **Musterlösung abrufen:** Zugriff auf die zur `questionId` gehörige Musterlösung (z.B. über den `PrismaService` aus der Datenbank, Annahme: Musterlösungen sind pro Frage gespeichert). Wenn keine Musterlösung verfügbar ist, kann dieser Knoten kein Feedback generieren.
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM erstellen. Dieser enthält die Aufgabenstellung, die Studenten-Lösung, die Musterlösung (als Kontext für den LLM, nicht zur direkten Ausgabe!) und optional das KM-Feedback.
    *   **LLM-Call:**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KCR-Prompt (siehe Punkt 3).
    *   **Antwort-Generierung:** Der LLM generiert eine Beschreibung des korrekten Ansatzes oder hebt Schlüsselunterschiede/Konzepte hervor.
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KCR` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KCR-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/kcr.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein erfahrener Informatik-Tutor. Deine Aufgabe ist es, den korrekten *Ansatz* zur Lösung einer Programmieraufgabe zu erklären, basierend auf einer Musterlösung, ohne den Code der Musterlösung preiszugeben."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, `modelSolution` (als interne Referenz für dich), `kmFeedback` (optional, Fehlerbeschreibung).
        *   **Anweisungen:**
            *   "Analysiere die `studentSolution` im Vergleich zur `modelSolution` und dem optionalen `kmFeedback`."
            *   "Beschreibe den Kern des korrekten Lösungsansatzes, der in der `modelSolution` verwendet wird, in konzeptionellen Schritten oder als Algorithmusbeschreibung."
            *   "Wenn `kmFeedback` vorhanden ist, erkläre, wie der korrekte Ansatz die beschriebenen Fehler vermeidet."
            *   "Fokussiere dich auf das *Was* und *Warum* des korrekten Ansatzes."
            *   "**WICHTIG: Gib unter keinen Umständen Code-Teile aus der `modelSolution` direkt in deiner Antwort an den Studenten aus.**"
            *   "Formuliere die Erklärung klar und didaktisch wertvoll."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge 2-3 Beispiele hinzu, wie man einen Ansatz beschreibt, ohne Code zu zeigen (z.B. für eine rekursive Lösung: "Der korrekte Ansatz hierfür ist oft rekursiv. Überlege dir einen Basisfall, in dem das Ergebnis direkt bekannt ist, und einen rekursiven Schritt, der das Problem auf eine kleinere Version desselben Problems reduziert.").

4.  **Abhängigkeiten:**
    *   `@langchain/openai`
    *   Interner State-Management-Mechanismus.
    *   Zugriff auf Musterlösungen (z.B. via `PrismaService`). Die Struktur, wie Musterlösungen gespeichert sind, muss definiert sein.
    *   Optional: Output des KM-Knotens.

5.  **Testing:**
    *   Unit-Tests für `generateKcrFeedback`:
        *   Mocking des LLM-Calls und des Datenbankzugriffs für die Musterlösung.
        *   Testen des Abrufs der Musterlösung.
        *   Überprüfen, ob der Prompt korrekt formatiert wird (insbesondere die Markierung der Musterlösung als interner Kontext).
        *   Überprüfen der Qualität der LLM-Antwort (beschreibend, kein Code).
        *   Testen des Fallbacks, wenn keine Musterlösung vorhanden ist.
        *   Überprüfen, ob der State korrekt aktualisiert wird.