# Plan: Implementierung des KM (Knowledge about Mistakes) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge about Mistakes" (KM) im `LanggraphFeedbackService`. Dieser Knoten analysiert Compiler-Fehlermeldungen und die Ergebnisse von Unit-Tests, um spezifische Fehler in der Studenten-Lösung zu identifizieren und verständliches Feedback dazu zu generieren.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KM-Feedback-Methode:**
    *   Name: z.B. `generateKmFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt.
    *   Input: Der aktuelle Langgraph-State (mindestens `compilerOutput: string`, `unitTestResults: any`, `studentSolution: string`, `taskDescription: string`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KM-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KM = "..."`).

2.  **Logik innerhalb der KM-Feedback-Methode:**
    *   **Datenextraktion:** `compilerOutput` und `unitTestResults` aus dem State extrahieren.
    *   **Fehleranalyse:**
        *   **Compiler-Fehler:** Parsen des `compilerOutput`, um spezifische Syntax- oder Typfehler zu identifizieren (z.B. fehlende Semikolons, unbekannte Variablen, Typ-Inkompatibilitäten). Extrahiere Fehlermeldung, Zeilennummer und relevanten Codeausschnitt, falls möglich.
        *   **Unit-Test-Fehler:** Analysieren der `unitTestResults`. Identifiziere, welche Tests fehlgeschlagen sind und warum (z.B. falscher Output, erwarteter vs. tatsächlicher Wert, aufgetretene Exceptions während des Tests).
    *   **Priorisierung:** Entscheiden, welche Fehler am relevantesten sind (z.B. der erste Compiler-Fehler, die wichtigsten fehlgeschlagenen Tests).
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM basierend auf den analysierten Fehlern, der Aufgabenstellung und der Studenten-Lösung erstellen.
    *   **LLM-Call:**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KM-Prompt (siehe Punkt 3).
    *   **Antwort-Generierung:** Der LLM generiert eine Erklärung für die identifizierten Fehler.
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KM` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KM-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/km.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein hilfreicher Informatik-Tutor. Deine Aufgabe ist es, spezifische Fehler in der Programmierlösung eines Studenten zu erklären, basierend auf Compiler-Meldungen und fehlgeschlagenen Unit-Tests."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, `compilerOutput` (oder die extrahierten relevanten Fehlermeldungen), `unitTestResults` (oder die extrahierten relevanten Test-Fehler).
        *   **Anweisungen:**
            *   "Analysiere die bereitgestellten Compiler-Fehler und/oder fehlgeschlagenen Unit-Tests."
            *   "Erkläre den wahrscheinlichsten Grund für den/die Fehler in einfacher Sprache."
            *   "Verweise auf die spezifische(n) Zeile(n) im Code des Studenten, wenn möglich."
            *   "Gib KEINE korrigierte Lösung oder direkten Code zur Fehlerbehebung an (das ist Aufgabe des KH-Knotens)."
            *   "Fokussiere dich auf das Verständnis des Fehlers selbst."
            *   "Wenn sowohl Compiler- als auch Test-Fehler vorliegen, beginne mit den Compiler-Fehlern."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge 2-3 Beispiele für Input (Kontext mit Fehlern) und den erwarteten Output (Fehlererklärung) hinzu.

4.  **Abhängigkeiten:**
    *   `@langchain/openai`
    *   Interner State-Management-Mechanismus
    *   Parsing-Logik für Compiler-Output und Unit-Test-Ergebnisse (ggf. Hilfsfunktionen).

5.  **Testing:**
    *   Unit-Tests für `generateKmFeedback`:
        *   Mocking des LLM-Calls.
        *   Testen mit verschiedenen Arten von `compilerOutput` (Syntaxfehler, Typfehler, keine Fehler).
        *   Testen mit verschiedenen `unitTestResults` (bestandene Tests, fehlgeschlagene Tests mit unterschiedlichen Gründen).
        *   Überprüfen, ob der Prompt korrekt formatiert wird.
        *   Überprüfen, ob der State korrekt aktualisiert wird.