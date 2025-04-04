# Plan: Implementierung des KC (Knowledge about Concepts) Feedback-Knotens

**Ziel:** Implementierung des Feedback-Knotens für "Knowledge about Concepts" (KC) im `LanggraphFeedbackService`. Dieser Knoten identifiziert relevante Programmierkonzepte basierend auf der Aufgabe, der Studenten-Lösung und potenziellen Fehlern (aus KM-Feedback) und generiert Erklärungen unter Verwendung von relevanten Vorlesungsausschnitten (RAG).

**Modul:** `server_nestjs/src/tutor-kai/langgraph-feedback`
**Service:** `langgraph-feedback.service.ts` (oder Nutzung/Refactoring von `feedback_rag.service.ts`)

**Kernkomponenten:**

1.  **KC-Feedback-Methode:**
    *   Name: z.B. `generateKcFeedback`
    *   Typ: Asynchrone Methode innerhalb des `LanggraphFeedbackService`.
    *   Funktion: Wird vom Langgraph aufgerufen, wenn der Router diesen Knoten auswählt.
    *   Input: Der aktuelle Langgraph-State (mindestens `taskDescription: string`, `studentSolution: string`, optional `generatedFeedbacks.KM: string`).
    *   Output: Der aktualisierte Langgraph-State, wobei das generierte KC-Feedback zum `generatedFeedbacks`-Feld hinzugefügt wurde (z.B. `state.generatedFeedbacks.KC = "..."`).

2.  **Logik innerhalb der KC-Feedback-Methode:**
    *   **Datenextraktion:** `taskDescription`, `studentSolution`, `generatedFeedbacks.KM` (falls vorhanden) aus dem State extrahieren.
    *   **Konzeptidentifikation:**
        *   Verwendung eines LLM-Calls (ähnlich `getConceptsPrompt` aus `feedback_rag.service.ts`) oder einer Heuristik, um 1-3 Schlüsselkonzepte zu identifizieren, die für das Verständnis oder die Lösung der Aufgabe/des Fehlers relevant sind. Input für diesen Schritt sind Task, Lösung und ggf. KM-Feedback.
    *   **RAG - Vorlesungsinhalte abrufen:**
        *   **Integration:** Entscheiden, ob die RAG-Logik direkt in `LanggraphFeedbackService` implementiert oder der bestehende `FeedbackRAGService` als Abhängigkeit genutzt wird. Refactoring könnte notwendig sein, um die Kern-RAG-Funktionen (Vektorsuche) wiederverwendbar zu machen.
        *   **Vektorsuche:** Für jedes identifizierte Konzept eine Ähnlichkeitssuche in der `PrismaVectorStore` durchführen (adaptiert von `getProgrammingConcepts` in `feedback_rag.service.ts`), um relevante `TranscriptChunk`-Objekte zu erhalten.
        *   **Snippet-Formatierung:** Die abgerufenen Inhalte und deren Metadaten (insbesondere `markdownLink` für die Quelle) für den nächsten LLM-Call aufbereiten. Zuweisung von eindeutigen Quellennummern (`$$Nr$$`) und Speicherung der Mappings (Nummer -> `markdownLink`), ähnlich wie in `feedback_rag.service.ts`.
    *   **Prompt-Formatierung (Feedback-Generierung):** Einen spezifischen Input-String für den LLM basierend auf Aufgabenstellung, Lösung, identifizierten Konzepten und den formatierten Vorlesungsausschnitten erstellen.
    *   **LLM-Call (Feedback-Generierung):**
        *   Verwendung von `ChatOpenAI` (GPT-4o).
        *   Aufruf des LLM mit dem formatierten Input und dem dedizierten KC-Prompt (siehe Punkt 3). Dieser Prompt ist ähnlich dem `finalRAGPrompt` aus `feedback_rag.service.ts`.
    *   **Antwort-Generierung:** Der LLM generiert eine Erklärung der Konzepte, die sich auf das Problem des Studenten bezieht und die Vorlesungsinhalte zitiert.
    *   **Quellenersetzung:** Die Platzhalter (`$$Nr$$`) in der LLM-Antwort durch die tatsächlichen `markdownLink`-Quellen ersetzen (Logik aus `feedback_rag.service.ts` wiederverwenden/anpassen).
    *   **State-Aktualisierung:** Das generierte Feedback (mit ersetzten Quellen) im State unter `generatedFeedbacks.KC` speichern.
    *   **Rückgabe:** Den aktualisierten State zurückgeben.

3.  **KC-Prompt:**
    *   Speicherort: `server_nestjs/src/tutor-kai/langgraph-feedback/prompts/kc.prompt.txt` (oder ähnlich).
    *   Inhalt (adaptiert von `finalRAGPrompt`):
        *   **Rolle:** "Du bist ein hilfreicher Professor für eine Informatik Einführungsvorlesung..."
        *   **Kontext:** Platzhalter für `taskDescription`, `studentSolution`, `identifiedConcepts` (die zu erklärenden Konzepte), `lectureSnippets` (die formatierten, nummerierten Vorlesungsausschnitte).
        *   **Anweisungen:**
            *   "Erkläre die relevanten `identifiedConcepts` im Kontext der `taskDescription` und der `studentSolution`."
            *   "Beziehe dich dabei auf die bereitgestellten `lectureSnippets`."
            *   "Zitiere die verwendeten Snippets IMMER und AUSSCHLIESSLICH im Format `$$Nummer$$` direkt hinter der relevanten Information."
            *   "Gib KEINE direkte Lösung für die Aufgabe."
            *   "Formuliere die Erklärung so, dass sie einem Anfänger hilft, das Konzept im Zusammenhang mit seinem Problem zu verstehen."
            *   "Formatiere deine Antwort klar und verständlich mit Markdown."
        *   **Beispiele:** Füge Beispiele für korrekte Zitation und kontextbezogene Erklärung hinzu.

4.  **Abhängigkeiten:**
    *   `@langchain/openai`, `@langchain/community/vectorstores/prisma`, `langgraph`
    *   `PrismaClient`, `PrismaVectorStore`, `OpenAIEmbeddings`
    *   Interner State-Management-Mechanismus
    *   Zugriff auf/Refactoring von Komponenten aus `feedback_rag.service.ts` (Vektorsuche, Quellenersetzung, ggf. Prompts).
    *   Konfiguration für OpenAI API Key und Datenbankverbindung.

5.  **Testing:**
    *   Unit-Tests für `generateKcFeedback`:
        *   Mocking von LLM-Calls und Vektorsuchen.
        *   Testen der Konzeptidentifikation.
        *   Testen der Vektorsuche und Snippet-Formatierung.
        *   Überprüfen, ob der KC-Prompt korrekt formatiert wird.
        *   Testen der Quellenersetzung in der finalen Antwort.
        *   Überprüfen, ob der State korrekt aktualisiert wird.