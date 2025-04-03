# Plan: Implementierung des KH (Knowledge on How to Proceed) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge on How to Proceed" (KH) im `LanggraphFeedbackService`. Dieser Knoten generiert Hinweise zur Fehlerbehebung (basierend auf KM-Feedback) oder zur Verbesserung von Code-Stil oder Effizienz, wenn keine direkten Fehler vorliegen.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KH-Feedback-Methode:**
    *   Name: z.B. `generateKhFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt.
    *   Input: Der aktuelle Langgraph-State (mindestens `studentSolution: string`, `taskDescription: string`, und optional `generatedFeedbacks.KM: string`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KH-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KH = "..."`).

2.  **Logik innerhalb der KH-Feedback-Methode:**
    *   **Datenextraktion:** `studentSolution`, `taskDescription` und das Ergebnis des KM-Knotens (`generatedFeedbacks.KM`) aus dem State extrahieren.
    *   **Analyse:**
        *   **Fehler vorhanden (KM-Feedback liegt vor):** Analysiere das KM-Feedback, um die Art des Fehlers zu verstehen.
        *   **Keine Fehler (kein KM-Feedback oder KM meldet keine Fehler):** Analysiere den `studentSolution` Code auf mögliche Verbesserungen (Stil, Lesbarkeit, Effizienz). Dies könnte eine separate LLM-Analyse oder heuristische Prüfungen beinhalten, oder direkt im KH-Prompt dem LLM überlassen werden.
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM basierend auf der Analyse, der Aufgabenstellung, der Lösung und dem KM-Feedback (falls vorhanden) erstellen.
    *   **LLM-Call:**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KH-Prompt (siehe Punkt 3).
    *   **Antwort-Generierung:** Der LLM generiert spezifische Hinweise zur Fehlerbehebung oder Verbesserungsvorschläge.
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KH` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KH-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/kh.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein hilfreicher Informatik-Tutor. Deine Aufgabe ist es, Studenten konkrete, aber nicht-verratende Hinweise zu geben, wie sie ihre Programmierlösung verbessern oder Fehler darin beheben können."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, und optional `kmFeedback` (die vom KM-Knoten generierte Fehlerbeschreibung).
        *   **Anweisungen:**
            *   "Basierend auf der Aufgabenstellung, der Lösung des Studenten und der optionalen Fehlerbeschreibung (`kmFeedback`), gib einen oder zwei hilfreiche Hinweise, wie der Student vorgehen kann."
            *   "Wenn `kmFeedback` vorhanden ist, konzentriere dich darauf, wie der beschriebene Fehler behoben werden kann. Gib Hinweise auf das zugrundeliegende Konzept oder die notwendige Änderung, ohne die Lösung direkt zu nennen. Beispiel: 'Überprüfe die Bedingung deiner `while`-Schleife auf Zeile X. Stellt sie sicher, dass die Schleife irgendwann endet?' oder 'Welche Methode der String-Klasse könnte nützlich sein, um zu prüfen, ob ein Teilstring enthalten ist?'"
            *   "Wenn kein `kmFeedback` vorhanden ist oder dieser keine Fehler beschreibt, analysiere den Code (`studentSolution`) auf mögliche Verbesserungen bezüglich Stil, Lesbarkeit oder Effizienz. Beispiel: 'Deine Variablennamen könnten deskriptiver sein.' oder 'Gibt es eine eingebaute Funktion, die diese Berechnung vereinfachen könnte?'"
            *   "Gib niemals vollständige Code-Snippets der korrigierten Lösung an."
            *   "Formuliere die Hinweise als Anregung oder Frage, um das Nachdenken zu fördern."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge 2-3 Beispiele hinzu:
            *   Input (Kontext + KM-Feedback zu Endlosschleife) -> Output (Hinweis zur Schleifenbedingung).
            *   Input (Kontext, kein KM-Feedback, aber unklare Variablennamen) -> Output (Hinweis zu deskriptiven Namen).

4.  **Abhängigkeiten:**
    *   `@langchain/openai`
    *   Interner State-Management-Mechanismus
    *   Optional: Output des KM-Knotens.

5.  **Testing:**
    *   Unit-Tests für `generateKhFeedback`:
        *   Mocking des LLM-Calls.
        *   Testen mit State, der KM-Feedback enthält -> Erwartet Hinweise zur Fehlerbehebung.
        *   Testen mit State ohne KM-Feedback -> Erwartet Verbesserungsvorschläge oder keine Aktion.
        *   Überprüfen, ob der Prompt korrekt formatiert wird (insbesondere die Einbindung des KM-Feedbacks).
        *   Überprüfen, ob der State korrekt aktualisiert wird.