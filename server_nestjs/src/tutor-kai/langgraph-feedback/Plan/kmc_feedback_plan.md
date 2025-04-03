# Plan: Implementierung des KMC (Knowledge about Meta-cognition) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge about Meta-cognition" (KMC) im `LanggraphFeedbackService`. Dieser Knoten generiert Feedback, das den Studenten zur Reflexion über seine Problemlösestrategien, sein Verständnis und seinen Lernprozess anregt, typischerweise durch sokratische Fragen.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KMC-Feedback-Methode:**
    *   Name: z.B. `generateKmcFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt (z.B. bei wiederholten Fehlern trotz Hinweisen, oder auch bei korrekten Lösungen zur Vertiefung).
    *   Input: Der aktuelle Langgraph-State (mindestens `taskDescription: string`, `studentSolution: string`, optional `generatedFeedbacks.KM: string`, `generatedFeedbacks.KH: string`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KMC-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KMC = "..."`).

2.  **Logik innerhalb der KMC-Feedback-Methode:**
    *   **Datenextraktion:** `taskDescription`, `studentSolution`, sowie optional vorhandenes KM- und KH-Feedback aus dem State extrahieren.
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM erstellen. Dieser enthält die Aufgabenstellung, die Studenten-Lösung und ggf. Hinweise auf bereits gegebene Fehlerbeschreibungen (KM) oder Lösungshinweise (KH).
    *   **LLM-Call:**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KMC-Prompt (siehe Punkt 3).
    *   **Antwort-Generierung:** Der LLM generiert eine oder zwei reflektierende Fragen oder Anregungen zur Strategie.
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KMC` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KMC-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/kmc.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein erfahrener Informatik-Tutor, der sich darauf konzentriert, Studenten zum Nachdenken über ihren Lern- und Problemlöseprozess anzuregen (Meta-Kognition)."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, `kmFeedback` (optional), `khFeedback` (optional).
        *   **Anweisungen:**
            *   "Basierend auf der Aufgabe, der Lösung des Studenten und ggf. den bisherigen Fehlern (`kmFeedback`) oder Hinweisen (`khFeedback`), formuliere ein oder zwei offene, sokratische Fragen."
            *   "Die Fragen sollen den Studenten dazu anregen, über seinen Ansatz, seine Strategie, sein Verständnis oder mögliche alternative Lösungswege nachzudenken."
            *   "Gib KEINE direkten Hinweise zur Lösung oder zu Fehlern im Code. Konzentriere dich auf den Denkprozess."
            *   "Beispiele für Fragen: 'Welche Schritte hast du unternommen, um sicherzustellen, dass deine Lösung korrekt ist?', 'Gab es Teile der Aufgabe, die du besonders schwierig fandest? Woran lag das deiner Meinung nach?', 'Welche alternativen Ansätze zur Lösung dieses Problems könntest du dir vorstellen?', 'Wie würdest du jemand anderem deinen Lösungsansatz erklären?'"
            *   "Wenn der Student wiederholt Fehler macht (ersichtlich aus KM/KH), frage nach seiner Strategie zur Fehlersuche."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge 2-3 Beispiele für Input (Kontext) und den erwarteten Output (reflektierende Fragen) hinzu.

4.  **Abhängigkeiten:**
    *   `@langchain/openai`
    *   Interner State-Management-Mechanismus.
    *   Optional: Output der KM- und KH-Knoten.

5.  **Testing:**
    *   Unit-Tests für `generateKmcFeedback`:
        *   Mocking des LLM-Calls.
        *   Testen mit unterschiedlichem Kontext (mit/ohne KM/KH-Feedback).
        *   Überprüfen, ob der Prompt korrekt formatiert wird.
        *   Überprüfen der Qualität der generierten Fragen (offen, reflektierend, nicht direktiv).
        *   Überprüfen, ob der State korrekt aktualisiert wird.