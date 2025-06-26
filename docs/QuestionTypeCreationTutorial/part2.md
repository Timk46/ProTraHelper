## Schritt 2: Integration in den Hauptservice

### 2.1 QuestionType Enum erweitern

Zunächst muss der neue Fragetyp zum Enum hinzugefügt werden in `shared/dtos/question.dto.ts`:

```typescript
export enum questionType {
  SINGLECHOICE = "SC",
  MULTIPLECHOICE = "MC",
  FREETEXT = "FreeText",
  CODE = "CodingQuestion",
  FILLIN = "Fillin",
  GRAPH = "GraphQuestion",
  UML = "UMLQuestion",
  CODEGAME = "CodeGameQuestion",
  UPLOAD = "UploadQuestion",  // <- Neu hinzugefügt
}
```

### 2.2 Hauptservice erweitern

In `server_nestjs/src/question-data/question-data.service.ts`:

#### 2.2.1 Service Import und Injection

```typescript
// Import hinzufügen
import { QuestionDataUploadService } from './question-data-upload/question-data-upload.service';

// Constructor erweitern
constructor(
  // ...andere Services...
  private qdUpload: QuestionDataUploadService
) {}
```

#### 2.2.2 getDetailedQuestion Methode erweitern

Switch-Statement erweitern:

```typescript
switch (questionTypeStr) {
  // ...existing cases...
  case questionType.UPLOAD:
    specificQuestionData = await this.prisma.uploadQuestion.findFirst({
      where: {
        questionId: Number(questionId)
      }
    });
    break;
}
```

QuestionData-Objekt erweitern:

```typescript
const questionData: detailedQuestionDTO = {
  // ...existing fields...
  uploadQuestion: questionTypeStr === questionType.UPLOAD ? specificQuestionData : undefined,
};
```

#### 2.2.3 updateWholeQuestion Methode erweitern

Switch-Statement für Updates:

```typescript
switch (question.type) {
  // ...existing cases...
  case questionType.UPLOAD:
    if (createNewVersion || !currentQuestion.uploadQuestion) {
      await this.qdUpload.createUploadQuestion(question.uploadQuestion, updatedQuestion.id);
    } else {
      await this.qdUpload.updateUploadQuestion(question.uploadQuestion);
    }
    break;
}
```

#### 2.2.4 detailedQuestionsUpdateable Methode erweitern

Validation für Upload-Fragen:

```typescript
private detailedQuestionsUpdateable(currQuestion: detailedQuestionDTO, newQuestion: detailedQuestionDTO): boolean {
  if (
    // ...existing conditions...
    (
      newQuestion.codingQuestion ||
      newQuestion.freetextQuestion ||
      newQuestion.mcQuestion ||
      newQuestion.fillinQuestion ||
      newQuestion.graphQuestion ||
      newQuestion.umlQuestion ||
      newQuestion.codeGameQuestion ||
      newQuestion.uploadQuestion  // <- Neu hinzugefügt
    )
  ){
    return true;
  }
  return false;
}
```

### 2.3 Wichtige Punkte

- **Konsistenz**: Alle Stellen im Hauptservice müssen erweitert werden
- **Switch-Cases**: Sowohl in `getDetailedQuestion` als auch in `updateWholeQuestion`
- **Validation**: `detailedQuestionsUpdateable` muss den neuen Typ kennen
- **Enum**: QuestionType Enum muss erweitert werden

---

**Status:** ✅ Backend Service implementiert ✅ Hauptservice Integration  
**Nächster Schritt:** createUserAnswer Methode für Upload-Feedback implementieren

---