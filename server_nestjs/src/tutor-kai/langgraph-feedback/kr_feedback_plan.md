# Plan: Implementierung des KR (Knowledge of Result) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge of Result" (KR) im `LanggraphFeedbackService`. Dieser Knoten gibt eine einfache binäre Rückmeldung ("korrekt" oder "nicht korrekt") basierend auf den Ergebnissen der Unit-Tests.

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts`

**Kernkomponenten:**

1.  **KR-Feedback-Methode:**
    *   Name: z.B. `generateKrFeedback`
    *   Typ: Synchrone oder asynchrone Methode innerhalb des `LanggraphFeedbackService`. (Kein LLM-Call nötig, daher synchron möglich).
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt.
    *   Input: Der aktuelle Langgraph-State (mindestens `unitTestResults: any`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KR-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KR = "..."`).

2.  **Logik innerhalb der KR-Feedback-Methode:**
    *   **Datenextraktion:** `unitTestResults` aus dem State extrahieren.
    *   **Ergebnisanalyse:**
        *   Analysiere die `unitTestResults`, um festzustellen, ob *alle* Tests erfolgreich bestanden wurden. Die genaue Struktur der `unitTestResults` muss bekannt sein (z.B. ein Array von Testobjekten mit einem `passed: boolean`-Feld oder eine Zusammenfassung).
        *   Setze ein internes Flag `allTestsPassed` entsprechend.
    *   **Feedback-Generierung:**
        *   Wenn `allTestsPassed` true ist, setze das Feedback auf eine positive Bestätigung (z.B. "Alle Tests erfolgreich! Deine Lösung scheint korrekt zu sein.").
        *   Wenn `allTestsPassed` false ist, setze das Feedback auf eine neutrale Feststellung (z.B. "Einige Tests sind fehlgeschlagen. Deine Lösung ist noch nicht ganz korrekt.").
    *   **State-Aktualisierung:** Das generierte Feedback im State unter `generatedFeedbacks.KR` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **Prompt:**
    *   Für diesen Knoten wird kein LLM-Call und somit kein spezifischer Prompt benötigt. Die Logik ist rein deterministisch basierend auf den Test-Ergebnissen.

4.  **Abhängigkeiten:**
    *   Interner State-Management-Mechanismus.
    *   Klare Definition der Struktur von `unitTestResults`.

5.  **Testing:**
    *   Unit-Tests für `generateKrFeedback`:
        *   Testen mit `unitTestResults`, die anzeigen, dass alle Tests bestanden wurden -> Erwartet positives Feedback.
        *   Testen mit `unitTestResults`, die anzeigen, dass mindestens ein Test fehlgeschlagen ist -> Erwartet neutrales/negatives Feedback.
        *   Testen mit verschiedenen Formaten/Strukturen von `unitTestResults`, um die Robustheit der Analyse sicherzustellen.
        *   Überprüfen, ob der State korrekt aktualisiert wird.