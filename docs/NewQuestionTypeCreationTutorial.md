# Tutorial: Neuen Aufgabentyp in HEFL erstellen

## Übersicht
Dieses Tutorial beschreibt die strategischen Schritte zur Implementierung eines neuen Aufgabentyps in der HEFL-Plattform. Es deckt alle Ebenen vom Datenbank-Schema bis zur Benutzeroberfläche ab.

## Voraussetzungen
- Grundkenntnisse in NestJS, Angular, Prisma
- Verständnis der HEFL-Architektur
- Zugriff auf die Entwicklungsumgebung

---

## 1. Datenbank-Schema (Prisma)

### 1.1 Hauptmodell erstellen
**Datei:** `server_nestjs/prisma/schema.prisma`

```prisma
model YourQuestionType {
  id         Int      @id @default(autoincrement())
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  questionId Int
  // Spezifische Felder für deinen Aufgabentyp
  title      String
  text       String
  // ... weitere Felder
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### 1.2 User-Answer-Modell erstellen (falls erforderlich)
```prisma
model UserYourAnswer {
  id           Int        @id @default(autoincrement())
  userAnswer   UserAnswer @relation(fields: [userAnswerId], references: [id], onDelete: Cascade)
  userAnswerId Int
  // Spezifische Antwortfelder
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}
```

### 1.3 Bestehende Modelle erweitern
```prisma
model Question {
  // ... bestehende Felder ...
  yourQuestionType YourQuestionType[]
}

model UserAnswer {
  // ... bestehende Felder ...
  userYourAnswer UserYourAnswer[]
}
```

### 1.4 Migration ausführen
```bash
cd server_nestjs
npx prisma migrate dev --name add-your-question-type
```

---

## 2. DTOs definieren (Shared)

### 2.1 Basis-DTO erstellen
**Datei:** `shared/dtos/question.dto.ts`

```typescript
export interface yourQuestionDTO {
  questionId: number;
  contentElementId?: number;
  title: string;
  text: string;
  // ... weitere Felder
  maxPoints: number;
}

export enum questionType {
  // ... bestehende Typen ...
  YOUR_TYPE = "YourQuestionType",
}
```

### 2.2 Detaillierte DTO erstellen
**Datei:** `shared/dtos/detailedQuestion.dto.ts`

```typescript
export interface detailedYourQuestionDTO {
  id?: number;
  questionId: number;
  title?: string;
  text?: string;
  // ... weitere Felder
  createdAt?: Date;
  updatedAt?: Date;
}

export interface detailedQuestionDTO {
  // ... bestehende Felder ...
  yourQuestion?: detailedYourQuestionDTO;
}
```

### 2.3 UserAnswer-DTO erweitern (falls erforderlich)
**Datei:** `shared/dtos/userAnswer.dto.ts`

```typescript
export interface UserAnswerDataDTO {
  // ... bestehende Felder ...
  userYourAnswer?: any; // Spezifische Antwortdaten
}
```

---

## 3. Backend-Service implementieren

### 3.1 Service erstellen
**Datei:** `server_nestjs/src/question-data/question-data-your-type/question-data-your-type.service.ts`

```typescript
@Injectable()
export class QuestionDataYourTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async getYourQuestion(questionId: number): Promise<yourQuestionDTO> {
    // Implementierung der Abfrage-Logik
  }

  async createYourQuestion(
    question: detailedYourQuestionDTO, 
    questionId: number
  ): Promise<detailedYourQuestionDTO> {
    // Implementierung der Erstellungs-Logik
  }

  async updateYourQuestion(
    question: detailedYourQuestionDTO
  ): Promise<detailedYourQuestionDTO> {
    // Implementierung der Update-Logik
  }
}
```

**Referenz:** Siehe `question-data-upload.service.ts` für vollständige Implementierung

### 3.2 Module-Integration
**Datei:** `server_nestjs/src/question-data/question-data.module.ts`

```typescript
@Module({
  providers: [
    // ... bestehende Services ...
    QuestionDataYourTypeService,
  ],
  // ...
})
```

### 3.3 Hauptservice erweitern
**Datei:** `server_nestjs/src/question-data/question-data.service.ts`

#### 3.3.1 Service importieren und injizieren
```typescript
import { QuestionDataYourTypeService } from './question-data-your-type/question-data-your-type.service';

constructor(
  // ... andere Services ...
  private readonly qdYourType: QuestionDataYourTypeService
) {}
```

#### 3.3.2 getDetailedQuestion erweitern
```typescript
switch (questionTypeStr) {
  // ... bestehende Cases ...
  case questionType.YOUR_TYPE:
    specificQuestionData = await this.prisma.yourQuestionType.findFirst({
      where: { questionId: Number(questionId) }
    });
    break;
}

const questionData: detailedQuestionDTO = {
  // ... bestehende Felder ...
  yourQuestion: questionTypeStr === questionType.YOUR_TYPE ? specificQuestionData : undefined,
};
```

#### 3.3.3 updateWholeQuestion erweitern
```typescript
switch (question.type) {
  // ... bestehende Cases ...
  case questionType.YOUR_TYPE:
    if (createNewVersion || !currentQuestion.yourQuestion) {
      await this.qdYourType.createYourQuestion(question.yourQuestion, updatedQuestion.id);
    } else {
      await this.qdYourType.updateYourQuestion(question.yourQuestion);
    }
    break;
}
```

#### 3.3.4 createUserAnswer erweitern (falls erforderlich)
```typescript
if (question.type === questionType.YOUR_TYPE) {
  console.log('generate feedback for your question type');
  
  // Bewertungslogik implementieren
  let userScore = 0;
  let feedbackText = '';
  
  // Feedback erstellen
  const feedback = await this.prisma.feedback.create({
    data: {
      userAnswerId: createdData.id,
      text: feedbackText,
      score: userScore
    }
  });
  
  return {
    // ... Feedback-Rückgabe
  };
}
```

### 3.4 Controller-Endpoints (falls erforderlich)
**Datei:** `server_nestjs/src/question-data/question-data.controller.ts`

```typescript
@Get('yourQuestion/:questionId')
async getYourQuestion(@Param('questionId') questionId: number) {
  return this.questionDataService.getYourQuestion(questionId);
}

@Post('createYourQuestion')
async createYourQuestion(@Body() yourQuestion: yourQuestionDTO) {
  return this.questionDataService.createYourQuestion(yourQuestion);
}
```

---

## 4. Frontend-Service erweitern

### 4.1 Angular Service erweitern
**Datei:** `client_angular/src/app/Services/question/question-data.service.ts`

```typescript
import { yourQuestionDTO } from '@DTOs/index';

getYourQuestion(questionVersionId: number): Observable<yourQuestionDTO> {
  return this.http.get<yourQuestionDTO>(`${environment.server}/question-data/yourQuestion/${questionVersionId}`);
}

createYourQuestion(yourQuestion: yourQuestionDTO): Observable<yourQuestionDTO> {
  return this.http.post<yourQuestionDTO>(`${environment.server}/question-data/createYourQuestion`, yourQuestion);
}

openYourEditDialog(data: { questionId?: number; mode: 'create' | 'edit' }): MatDialogRef<EditYourComponent> {
  return this.dialog.open(EditYourComponent, {
    width: '600px',
    data: data,
    disableClose: false
  });
}
```

---

## 5. Frontend-Komponenten erstellen

### 5.1 Edit-Dialog-Komponente
**Datei:** `client_angular/src/app/Pages/lecturersView/edit-your-type/edit-your-type.component.ts`

```typescript
@Component({
  selector: 'app-edit-your-type',
  standalone: true,
  imports: [/* Material modules */],
  templateUrl: './edit-your-type.component.html',
  styleUrl: './edit-your-type.component.scss'
})
export class EditYourTypeComponent implements OnInit {
  yourForm: FormGroup;
  mode: 'create' | 'edit';
  
  constructor(
    private fb: FormBuilder,
    private questionDataService: QuestionDataService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.yourForm = this.fb.group({
      // Formular-Felder definieren
    });
  }
  
  ngOnInit(): void {
    // Daten laden und Form initialisieren
  }
  
  onSave(): void {
    // Speicherlogik implementieren
  }
}
```

**Referenz:** Siehe `edit-upload.component.ts` für vollständige Implementierung

### 5.2 Student-Task-Komponente (falls erforderlich)
**Datei:** `client_angular/src/app/Pages/contentView/contentElement/your-task/your-task.component.ts`

```typescript
@Component({
  selector: 'app-your-task',
  templateUrl: './your-task.component.html',
  styleUrl: './your-task.component.scss'
})
export class YourTaskComponent {
  @Output() submitClicked = new EventEmitter<any>();
  yourQuestion: yourQuestionDTO | undefined;
  
  constructor(
    public dialogRef: MatDialogRef<YourTaskComponent>,
    private questionService: QuestionDataService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Initialisierung
  }
  
  onSubmit(): void {
    // Antwort-Logik implementieren
  }
}
```

---

## 6. UI-Integration

### 6.1 Create-Content-Element-Dialog erweitern
**Datei:** `client_angular/src/app/Pages/lecturersView/create-content-element-dialog/create-content-element-dialog.component.html`

```html
<mat-select placeholder="Fragentyp" formControlName="questionType">
  <!-- ... bestehende Optionen ... -->
  <mat-option [value]="questionTypes.YOUR_TYPE">Dein Aufgabentyp</mat-option>
</mat-select>
```

### 6.2 Content-List-Item erweitern
**Datei:** `client_angular/src/app/Pages/content-list/content-list-item/content-list-item.component.ts`

```typescript
getQuestionTypeReadable(type: string | undefined): string {
  switch (type) {
    // ... bestehende Cases ...
    case questionType.YOUR_TYPE:
      return 'Dein Aufgabentyp';
    default:
      return 'Aufgabe';
  }
}

getQuestionTypeIcon(type: string | undefined): string {
  switch (type) {
    // ... bestehende Cases ...
    case questionType.YOUR_TYPE:
      return 'your_icon'; // Material Icon
    default:
      return 'help';
  }
}

onTaskEdit() {
  switch (question.type) {
    // ... bestehende Cases ...
    case questionType.YOUR_TYPE:
      const dialogRef = this.questionDataService.openYourEditDialog({
        questionId: question.id,
        mode: 'edit'
      });
      
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.snackBar.open('Aufgabe aktualisiert', 'OK', { duration: 3000 });
        }
      });
      break;
  }
}

onTaskClick() {
  switch (question.type) {
    // ... bestehende Cases ...
    case questionType.YOUR_TYPE:
      // Nur hinzufügen, wenn Student-Dialog benötigt wird
      dialogRef = this.dialog.open(YourTaskComponent, { ...dialogConfig, width: '70vw' });
      break;
  }
}
```

---

## 7. Testing

### 7.1 Backend-Tests
**Datei:** `server_nestjs/src/question-data/question-data-your-type/question-data-your-type.service.spec.ts`

```typescript
describe('QuestionDataYourTypeService', () => {
  let service: QuestionDataYourTypeService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionDataYourTypeService, PrismaService],
    }).compile();

    service = module.get<QuestionDataYourTypeService>(QuestionDataYourTypeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create your question', async () => {
    // Test-Implementierung
  });
});
```

### 7.2 Frontend-Tests
**Datei:** `client_angular/src/app/Pages/lecturersView/edit-your-type/edit-your-type.component.spec.ts`

```typescript
describe('EditYourTypeComponent', () => {
  let component: EditYourTypeComponent;
  let fixture: ComponentFixture<EditYourTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditYourTypeComponent]
    }).compileComponents();
  });

  it('should create', () => {
    // Test-Implementierung
  });
});
```

---

## 8. Deployment

### 8.1 Migration ausführen
```bash
cd server_nestjs
npx prisma migrate deploy
```

### 8.2 Datenbank seedern (falls erforderlich)
**Datei:** `server_nestjs/prisma/seed.ts`

```typescript
// Beispiel-Daten für deinen Aufgabentyp hinzufügen
```

### 8.3 Build und Deploy
```bash
# Backend
cd server_nestjs
npm run build

# Frontend
cd client_angular
npm run build
```

---

## 9. Debugging und Troubleshooting

### 9.1 Häufige Probleme
- **Prisma-Fehler**: Stelle sicher, dass Migrationen korrekt ausgeführt wurden
- **Import-Fehler**: Überprüfe DTO-Importe in beiden Projekten
- **Dialog-Probleme**: Vergewissere dich, dass alle Material-Module importiert sind

### 9.2 Logging
```typescript
// Verwende console.log für Development
console.log('Debug info:', yourData);

// Verwende Logger für Production
this.logger.log('Your question created', YourQuestionService.name);
```

---

## 10. Checkliste

### Backend
- [ ] Prisma-Schema erweitert
- [ ] DTOs erstellt
- [ ] Service implementiert
- [ ] Hauptservice integriert
- [ ] Module registriert
- [ ] Controller-Endpoints (falls erforderlich)
- [ ] Tests geschrieben

### Frontend
- [ ] Angular-Service erweitert
- [ ] Edit-Dialog-Komponente erstellt
- [ ] Student-Task-Komponente erstellt (falls erforderlich)
- [ ] Create-Dialog erweitert
- [ ] Content-List-Item erweitert
- [ ] Tests geschrieben

### Integration
- [ ] End-to-End-Tests
- [ ] Manuelle Tests
- [ ] Migration getestet
- [ ] Deployment vorbereitet

---

## Referenzen

- **Vollständige Implementierung**: Siehe `UploadQuestion` als Referenz
- **Backend-Service**: `question-data-upload.service.ts`
- **Frontend-Dialog**: `edit-upload.component.ts`
- **Student-Interface**: `upload-task.component.ts`
- **Integration**: `content-list-item.component.ts`

## Fazit

Dieser Workflow stellt sicher, dass neue Aufgabentypen vollständig und konsistent in die HEFL-Plattform integriert werden. Jeder Schritt baut auf dem vorherigen auf und folgt den etablierten Architektur-Mustern der Anwendung.