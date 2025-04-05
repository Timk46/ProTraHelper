# Plan: Implementierung des Langgraph Router-Knotens (Überarbeitet)

**Ziel:** Implementierung eines adaptiven, didaktisch fundierten Router-Knotens innerhalb des `LanggraphFeedbackService`. Dieser Knoten entscheidet basierend auf dem aktuellen Zustand (Code, Compiler-Output, Unit-Tests), der Fehlerhistorie (z.B. Anzahl Versuche) und potenziell dem beobachtbaren Studentenverhalten, *ob* elaboriertes Feedback gegeben werden soll und wenn ja, *welche Kombination* von Feedback-Typen am besten geeignet ist, um den Lernprozess zu unterstützen, ohne die Selbstständigkeit zu untergraben ("Let them try first").

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **Router-Methode:**
    *   Name: z.B. `routeFeedbackNodes`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Dient als "Conditional Edge" in der Langgraph-Definition.
    *   Input: Der aktuelle Langgraph-State (mindestens `compilerOutput: string`, `unitTestResults: any`, `taskDescription: string`, `studentSolution: string`, `attemptCount: number`, optional `studentActionsSummary: string` zur Verhaltensanalyse).
    *   Output: Eine Liste von Strings, die die Namen der als Nächstes auszuführenden Feedback-Knoten repräsentieren (z.B. `['KM', 'KH']` oder `['KR', 'KP']` oder `[]` für kein elaboriertes Feedback).

2.  **Logik innerhalb der Router-Methode:**
    *   **Datenextraktion:** Relevante Daten aus dem Input-State extrahieren: `compilerOutput`, `unitTestResults`, `taskDescription`, `studentSolution`, `attemptCount`, `studentActionsSummary`.
    *   **(Optional) Voranalyse/Heuristik:** Einfache Regeln anwenden, um offensichtliche Fälle zu behandeln (z.B. wenn `attemptCount === 1` und nur kleiner Syntaxfehler -> evtl. nur `['KR', 'KP', 'KM']` ohne LLM-Call).
    *   **Prompt-Formatierung:** Einen spezifischen Input-String für den LLM basierend auf den extrahierten Daten und einem vordefinierten Template erstellen.
    *   **LLM-Call (Kernentscheidung):**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem überarbeiteten, dedizierten Router-Prompt (siehe Punkt 3). Der LLM soll entscheiden, *ob* elaboriertes Feedback nötig ist und *welche* Typen kombiniert werden sollen.
    *   **Antwort-Parsing:** Die Antwort des LLM (erwartet wird eine Liste von Knotennamen oder ein Signal für minimales/kein Feedback) parsen und validieren.
    *   **Rückgabe:** Die validierte Liste der Knotennamen zurückgeben.

3.  **Überarbeiteter Router-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/router.prompt.txt` (oder ähnlich).
    *   Inhalt:
        *   **Rolle:** "Du bist ein erfahrener Informatik-Tutor mit didaktischem Hintergrund. Deine Aufgabe ist es, basierend auf der Aufgabenstellung, der Lösung eines Studenten, Compiler-/Test-Ergebnissen, der Versuchshistorie (`attemptCount`) und ggf. einer Verhaltenszusammenfassung (`studentActionsSummary`), zu entscheiden, ob und welches Feedback jetzt am hilfreichsten ist. Beachte das Prinzip 'Let them try first' - gib nicht sofort alle Informationen, sondern unterstütze den Lernprozess schrittweise."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, `compilerOutput`, `unitTestResults`, `attemptCount`, `studentActionsSummary` (z.B. "zeigt Anzeichen von Trial-and-Error", "macht stetige Fortschritte", "hat Code verschlechtert").
        *   **Verfügbare Feedback-Typen:** Liste der Typen (KR, KCR, KP, KTC, KC, KM, KH, KMC) mit kurzer Beschreibung ihrer Funktion (kognitiv, metakognitiv).
        *   **Entscheidungslogik (Anleitung für LLM):**
            *   **Priorität 1: Selbstständigkeit fördern.** Wenn `attemptCount` niedrig ist, der Fehler geringfügig erscheint oder der Student Fortschritte macht (`PROGR`), gib nur minimales Feedback (`['KR', 'KP']`) oder schlage kein elaboriertes Feedback vor (leere Liste `[]`).
            *   **Trigger für elaboriertes Feedback:** Wähle eine Kombination elaborierter Typen nur, wenn klare Indikatoren vorliegen:
                *   Gravierende logische/konzeptionelle Fehler (LOGE).
                *   Wiederholte Fehler trotz vorheriger Versuche (`attemptCount > 1`).
                *   Kein Fortschritt / Verschlechterung / Trial-and-Error (`STEPBACK`, `T&E` aus `studentActionsSummary`).
                *   Explizite Hilfeanfrage (`REQUEST` - falls diese Info verfügbar ist).
            *   **Gestufte Auswahl (wenn elaboriertes Feedback nötig):**
                *   *Fokus auf Fehlerbehebung:* Bei Fehlern starte mit `KM` (Was ist falsch?). Ergänze bei Bedarf (`attemptCount > 1` oder komplexer Fehler) mit `KH` (Wie beheben?) und/oder `KC` (Welches Konzept fehlt?).
                *   *Fokus auf Verbesserung (keine Fehler):* Wenn Tests OK sind, aber Verbesserungspotenzial besteht (Stil, Effizienz, Constraints), wähle `KH` und/oder `KTC`.
                *   *Fokus auf Reflexion:* Füge `KMC` hinzu, wenn der Student feststeckt, wiederholt Fehler macht oder auch bei korrekten Lösungen zur Vertiefung des Verständnisses.
                *   *KCR (Ansatz beschreiben):* Nur als letzte Eskalationsstufe bei wiederholten, gravierenden Fehlern und wenn andere Feedback-Typen nicht fruchten (`attemptCount` hoch).
            *   **Kombination:** Wähle eine *sinnvolle, nicht überladene* Kombination (max. 2-3 elaborierte Typen gleichzeitig, plus evtl. KR/KP).
        *   **Output-Format:** "Gib deine Entscheidung als JSON-Array von Strings zurück. Beispiel: `['KM', 'KH']` oder `['KR', 'KP']` oder `[]`."
        *   **Beispiele:** Füge 3-4 Beispiele hinzu, die die gestufte Logik und die Trigger illustrieren.

4.  **Integration in Langgraph:**
    *   Die `routeFeedbackNodes`-Methode wird als `conditional_edge` verwendet. Die zurückgegebene Liste steuert, welche Knoten als Nächstes aufgerufen werden. Eine leere Liste könnte zu einem Endknoten führen, der nur eine Bestätigung oder eine Aufforderung zum Weitermachen ausgibt.

5.  **Abhängigkeiten:**
    *   `@langchain/openai`, `langgraph`
    *   Robuster State-Management-Mechanismus mit `attemptCount`.
    *   (Optional aber empfohlen) Mechanismus zur Analyse von `studentActions` zur Erkennung von T&E, STEPBACK, PROGR. Dies könnte eine separate Logik oder ein weiterer LLM-Call sein.
    *   Konfiguration für OpenAI API Key.

6.  **Testing:**
    *   Unit-Tests für `routeFeedbackNodes`:
        *   Mocking des LLM-Calls.
        *   Testen verschiedener Input-States (unterschiedliche `attemptCount`, Fehlerarten, `studentActionsSummary`).
        *   Überprüfen, ob der Prompt korrekt formatiert wird.
        *   Überprüfen, ob die zurückgegebenen Knotenlisten der gestuften Logik entsprechen (z.B. minimales Feedback bei `attemptCount=1`, elaborierteres bei `attemptCount=3`).
    *   Integrationstests (später): Sicherstellen, dass der adaptive Fluss im Graphen funktioniert.