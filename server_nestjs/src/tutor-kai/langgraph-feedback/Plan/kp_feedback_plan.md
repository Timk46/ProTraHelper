# Plan: Implementierung des KP (Knowledge of Performance) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge of Performance" (KP) im `LanggraphFeedbackService`. Dieser Knoten generiert eine summative Rückmeldung über die Leistung des Studenten basierend auf den Ergebnissen der Unit-Tests (z.B. Anzahl oder Prozentsatz bestandener Tests).

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KP-Feedback-Methode:**
    *   Name: z.B. `generateKpFeedback`
    *   Typ: Synchrone oder asynchrone Methode (Kein LLM-Call nötig, daher synchron möglich).
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt.
    *   Input: Der aktuelle Langgraph-State (mindestens `unitTestResults: any`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KP-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KP = "..."`).

2.  **Logik innerhalb der KP-Feedback-Methode:**
    *   **Datenextraktion:** `unitTestResults` aus dem State extrahieren.
    *   **Ergebnisanalyse:**
        *   Analysiere die `unitTestResults`, um die Gesamtzahl der durchgeführten Tests und die Anzahl der erfolgreich bestandenen Tests zu ermitteln. Die genaue Struktur der `unitTestResults` ist hierfür entscheidend.
        *   Beispiel: Wenn `unitTestResults` ein Array von Objekten mit `passed: boolean` ist, zähle die Gesamtlänge und die Anzahl der Objekte mit `passed === true`.
    *   **Feedback-Generierung:**
        *   Formatiere eine Zeichenkette, die die Leistung zusammenfasst. Beispiele:
            *   "Du hast {anzahlBestanden} von {anzahlGesamt} Tests bestanden."
            *   "Deine Lösung hat {prozentBestanden}% der Tests erfolgreich durchlaufen."
            *   Bei 100%: "Sehr gut, alle {anzahlGesamt} Tests waren erfolgreich!"
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KP` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **Prompt:**
    *   Für diesen Knoten wird kein LLM-Call und somit kein spezifischer Prompt benötigt. Die Logik ist rein deterministisch.

4.  **Abhängigkeiten:**
    *   Interner State-Management-Mechanismus.
    *   Klare Definition der Struktur von `unitTestResults`, um die Zählung zu ermöglichen.

5.  **Testing:**
    *   Unit-Tests für `generateKpFeedback`:
        *   Testen mit `unitTestResults`, bei denen alle Tests bestanden wurden.
        *   Testen mit `unitTestResults`, bei denen kein Test bestanden wurde.
        *   Testen mit `unitTestResults`, bei denen ein Teil der Tests bestanden wurde.
        *   Überprüfen der korrekten Berechnung (Anzahl, Prozentsatz) und der Textformatierung.
        *   Überprüfen, ob der State korrekt aktualisiert wird.