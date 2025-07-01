## Schritt 3: createUserAnswer Methode für Upload-Fragen

### 3.1 UserAnswerDataDTO erweitern

Zunächst muss die DTO für User-Antworten erweitert werden in `shared/dtos/userAnswer.dto.ts`:

```typescript
export interface UserAnswerDataDTO {
    id: number;
    contentElementId?: number;
    userId: number;
    questionId: number;
    userFreetextAnswer?: string;
    userFreetextAnswerRaw?: string;
    userMCAnswer?: number[];
    userFillinTextAnswer?: UserFillinAnswer[];
    userGraphAnswer?: GraphStructureDTO[];
    codeGameEvaluation?: CodeGameEvaluationDTO;
    userUploadFileId?: number;  // <- Neu hinzugefügt für Upload-Fragen
    //space for more types of answers
}
```

### 3.2 createUserAnswer Methode erweitern

In der `createUserAnswer` Methode von `question-data.service.ts` wird ein neuer If-Block hinzugefügt:

```typescript
// generate feedback for upload question
if (question.type === questionType.UPLOAD) {
  console.log('generate feedback for upload user answer');

  let feedbackText = 'Du hast keine Datei hochgeladen.';
  let userScore = 0;
  let markedAsDone = false;

  if (answerData.userUploadFileId) {
    // Check if the file exists in the database
    const uploadedFile = await this.prisma.file.findUnique({
      where: {
        id: answerData.userUploadFileId
      }
    });

    if (uploadedFile) {
      // Create UserUploadAnswer entry
      await this.prisma.userUploadAnswer.create({
        data: {
          userAnswerId: createdData.id,
          fileId: answerData.userUploadFileId
        }
      });

      userScore = question.score; // Full points if file exists
      feedbackText = `Du hast erfolgreich die Datei "${uploadedFile.name}" hochgeladen. Du hast ${question.score} von ${question.score} Punkten erreicht. Die Aufgabe wird als gelöst markiert und dein Fortschritt erhöht.`;
      
      // Mark as done since upload was successful
      await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
      markedAsDone = true;
    } else {
      feedbackText = 'Die hochgeladene Datei konnte nicht gefunden werden. Bitte versuche es erneut.';
    }
  }

  // Create feedback for user answer
  const feedback = await this.prisma.feedback.create({
    data: {
      userAnswerId: createdData.id,
      text: feedbackText,
      score: userScore
    }
  });

  if (!feedback) throw new Error('Could not create Feedback');

  return {
    id: feedback.id,
    userAnswerId: feedback.userAnswerId,
    score: feedback.score,
    feedbackText: feedback.text,
    elementDone: markedAsDone,
    progress: Math.floor((feedback.score/question.score) * 100),
  }
}
```

### 3.3 Logik der Upload-Bewertung

#### 3.3.1 Datenstruktur
- **UserAnswer**: Basis-Antwort (wie bei allen Fragetypen)
- **UserUploadAnswer**: Spezifische Upload-Antwort mit Referenz zur hochgeladenen Datei

#### 3.3.2 Bewertungslogik
- **100% Punkte**: Wenn die Datei unter der angegebenen ID existiert
- **0% Punkte**: Wenn keine Datei-ID angegeben oder Datei nicht gefunden
- **Aufgabe abgeschlossen**: Bei erfolgreicher Datei-Verifikation

#### 3.3.3 Feedback-Generierung
- **Erfolg**: Bestätigung mit Dateiname und Punktzahl
- **Fehler**: Hinweis auf fehlende oder nicht gefundene Datei
- **Automatische Bewertung**: Keine AI-Analyse nötig

### 3.4 Wichtige Punkte

- **Zwei Tabellen**: UserAnswer (allgemein) + UserUploadAnswer (spezifisch)
- **File-Verifikation**: Prüfung ob Datei in File-Tabelle existiert
- **Vollständige Bewertung**: 100% oder 0% - keine Teilpunkte
- **Sofortige Rückmeldung**: Keine externe Bewertung nötig
- **Konsistente Struktur**: Gleiche Rückgabe-Struktur wie andere Fragetypen

---

**Status:** ✅ Backend Service implementiert ✅ Hauptservice Integration ✅ createUserAnswer implementiert  
**Nächster Schritt:** Controller und API Endpoints erstellen

---