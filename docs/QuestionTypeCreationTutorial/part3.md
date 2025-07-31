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
    userUploadAnswer?: UserUploadAnswerDTO; // <- Geändert von userUploadFileId
    //space for more types of answers
}

export interface UserUploadAnswerDTO {
    id?: number;
    userAnswerId?: number;
    fileId?: number;
    file?: FileUploadDTO;
}
```

### 3.2 createUserAnswer Methode erweitern

In der `createUserAnswer` Methode von `question-data.service.ts` wird der If-Block für Upload-Fragen angepasst:

```typescript
// generate feedback for upload question
if (question.type === questionType.UPLOAD) {
  console.log('generate feedback for upload user answer');
  let userScore = 0;

  // Check file type compatibility
  const expectedFileType = detailedQuestion.uploadQuestion.fileType.toLowerCase();
  const actualFileType = answerData.userUploadAnswer.file.type.toLowerCase();

  // Basic MIME type mapping
  const mimeTypeMap: { [key: string]: string[] } = {
    'pdf': ['application/pdf'],
    'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'txt': ['text/plain'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'zip': ['application/zip'],
  };

  let isValidType = false;
  if (expectedFileType.includes('*')) {
    const typeCategory = expectedFileType.replace('*', '');
    isValidType = actualFileType.startsWith(typeCategory);
  } else if (mimeTypeMap[expectedFileType]) {
    isValidType = mimeTypeMap[expectedFileType].includes(actualFileType);
  } else {
    isValidType = expectedFileType === actualFileType;
  }

  if (!isValidType) {
    throw new Error(`File type mismatch: expected ${expectedFileType}, got ${actualFileType}`);
  }

  // Upload file using ProductionFilesService
  const uploadedFile = await this.productionFilesService.uploadProductionFile(
    Buffer.from(answerData.userUploadAnswer.file.file, 'base64'),
    answerData.userUploadAnswer.file.name,
    expectedFileType,
  );

  if (!uploadedFile) {
    throw new Error('File upload failed');
  }

  // Create UserUploadAnswer entry
  const uploadAnswer = await this.prisma.userUploadAnswer.create({
    data: {
      userAnswerId: createdData.id,
      fileId: uploadedFile.id
    }
  });

  if (!uploadAnswer) throw new Error('Could not create UserUploadAnswer');

  userScore = question.score; // Full points if file exists
  const feedbackText = `Du hast erfolgreich die Datei "${uploadedFile.name}" hochgeladen.`;

  // Mark as done
  await this.contentService.questionContentElementDone(answerData.contentElementId, question.conceptNodeId, question.level, userId);
  const markedAsDone = true;

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
    progress: Math.floor((feedback.score / userScore) * 100),
  }
}
```

### 3.3 Logik der Upload-Bewertung

#### 3.3.1 Datenstruktur
- **UserAnswer**: Basis-Antwort (wie bei allen Fragetypen)
- **UserUploadAnswer**: Spezifische Upload-Antwort mit Referenz zur hochgeladenen Datei
- **FileUploadDTO**: DTO für die hochgeladene Datei

#### 3.3.2 Bewertungslogik
- **Dateityp-Validierung**: Überprüft, ob der hochgeladene Dateityp mit dem erwarteten Typ übereinstimmt.
- **Upload-Service**: Verwendet den `productionFilesService` zum Speichern der Datei.
- **100% Punkte**: Wenn die Datei erfolgreich hochgeladen und in der Datenbank gespeichert wurde.
- **Aufgabe abgeschlossen**: Bei erfolgreichem Upload.

#### 3.3.3 Feedback-Generierung
- **Erfolg**: Bestätigung mit Dateiname.
- **Fehler**: Wirft einen Fehler bei Typ-Inkompatibilität oder Upload-Fehler.

### 3.4 Wichtige Punkte

- **DTO-Änderung**: `userUploadFileId` wurde durch `userUploadAnswer` (ein `UserUploadAnswerDTO`-Objekt) ersetzt.
- **Service-Verwendung**: Der `productionFilesService` ist jetzt für das Datei-Handling verantwortlich.
- **Robuste Validierung**: Die Dateityp-Validierung ist jetzt Teil der `createUserAnswer`-Logik.
- **Fehlerbehandlung**: Die Methode wirft jetzt spezifischere Fehler.

---

**Status:** ✅ Backend Service implementiert ✅ Hauptservice Integration ✅ createUserAnswer implementiert  
**Nächster Schritt:** Controller und API Endpoints erstellen

---
