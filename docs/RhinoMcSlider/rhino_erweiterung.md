# Rhino-Erweiterung: Dynamic Grasshopper File Integration

## 1. Projektübersicht

### Aktuelle Situation
Das HEFL-System verfügt bereits über eine funktionsfähige Rhino-Integration mit zwei parallelen Systemen:
- **Direct Rhino**: Direkte Prozess-Ausführung über Windows API
- **BAT Rhino**: Generierung von Batch-Skripten für Download

### Identifizierte Probleme
1. **Hardcoded Pfade**: Grasshopper-Dateien sind statisch in den Services kodiert
2. **Mangelnde Flexibilität**: Keine aufgabenspezifische Zuordnung von .gh-Dateien
3. **Redundante Implementierung**: Beide Systeme haben ähnliche Hardcoding-Probleme

### Ziel
Implementierung einer dynamischen, aufgabenspezifischen Grasshopper-Datei-Zuordnung, die es ermöglicht, verschiedene .gh-Dateien basierend auf dem gewählten Content Element oder der Frage zu laden.

## 2. Architektur-Analyse

### Bestehende Komponenten

#### Backend (server_nestjs/src/)
- **rhino-direct/**: Direkte Rhino-Ausführung
  - `rhino-direct.service.ts`: Hauptservice mit dynamischer Pfad-Unterstützung
  - `rhino-direct.controller.ts`: REST-API für Rhino-Operationen
  - `rhino-window-manager.service.ts`: Windows-Fensterverwaltung
- **bat-rhino/**: Batch-Skript-basierte Integration
  - `bat-script-generator.service.ts`: Enthält hardcoded Pfad (Zeile 393)

#### Frontend (client_angular/src/app/)
- **Pages/content-list/**: Hauptkomponente für Content-Anzeige
  - `content-list.component.ts`: Enthält hardcoded Pfad in `onRhinoBatDirectButtonClick()`
- **Services/**: Rhino-Integration Services
  - `bat-rhino.service.ts`: Core-Service für Rhino-Ausführung
  - `rhino-focus.service.ts`: Fensterverwaltung
  - `mcslider-rhino-integration.service.ts`: MCSlider-spezifische Integration

#### Datenstrukturen
- **ContentDTO**: Repräsentiert Content-Knoten mit zugehörigen Elementen
- **ContentElementDTO**: Einzelne Content-Elemente mit Fragen
- **QuestionDTO**: Frage-Definitionen verschiedener Typen
- **FileDto**: Datei-Metadaten und -Pfade

### Verfügbare Grasshopper-Dateien
```
/files/Grasshopper/
├── Rahmen.gh
├── Test.gh
└── example.gh
```

## 3. Lösungskonzept

### 3.1 Gewählter Ansatz: Question-Based Dynamic File Resolution

Nach eingehender Analyse der Optionen (Content Element Association, Question-Specific Files, Hybrid Mapping Service) wurde ein question-basierter Ansatz mit Multi-Level-Fallback gewählt.

**Vorteile:**
- Direkte Zuordnung von Grasshopper-Dateien zu spezifischen Fragen
- Nutzt bestehende Question/Content-Architektur
- Minimal invasive Implementierung
- Skalierbar für alle Fragetypen

### 3.2 Multi-Level Fallback-Strategie

```
1. Question-specific file (direkte Zuordnung)
   ↓
2. Question type mapping (z.B. MCSLIDER → Rahmen.gh)
   ↓
3. Content element mapping (falls verfügbar)
   ↓
4. Global fallback (example.gh)
```

## 4. Implementierungsplan

### Phase 1: Infrastructure & Data Model (Woche 1)

#### 4.1 Database Schema Erweiterung
```sql
-- Prisma Schema Erweiterung
model Question {
  // ... existing fields
  grasshopperFileId Int?
  grasshopperFile   File? @relation("QuestionGrasshopperFile", fields: [grasshopperFileId], references: [id])
  rhinoSettings     Json?
}

model File {
  // ... existing fields
  grasshopperQuestions Question[] @relation("QuestionGrasshopperFile")
}
```

#### 4.2 DTO-Erweiterungen
```typescript
// shared/dtos/question.dto.ts
export interface QuestionDTO {
  // ... existing fields
  grasshopperFileId?: number;
  grasshopperFile?: FileDto;
  rhinoIntegration?: RhinoIntegrationConfig;
}

export interface RhinoIntegrationConfig {
  enabled: boolean;
  autoLaunch?: boolean;
  showViewport?: boolean;
  batchMode?: boolean;
  fileMapping?: {
    primary?: string;
    fallback?: string;
  };
}

// shared/dtos/rhino-execution.dto.ts (neu)
export interface RhinoExecutionContext {
  contentId?: number;
  contentElementId?: number;
  questionId?: number;
  questionType?: string;
  userId?: number;
  sessionId?: string;
}

export interface DynamicGrasshopperRequest {
  context: RhinoExecutionContext;
  rhinoSettings?: RhinoIntegrationConfig;
  fallbackEnabled?: boolean;
}
```

### Phase 2: Backend Services (Woche 2)

#### 4.3 Question Data Service Erweiterung
```typescript
// server_nestjs/src/question-data/question-data.service.ts
export class QuestionDataService {
  async getQuestionWithGrasshopperFile(questionId: number): Promise<QuestionWithGrasshopper> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        grasshopperFile: true,
        // ... other relations
      }
    });

    return {
      ...question,
      grasshopperFile: question.grasshopperFile || null,
      rhinoIntegration: question.rhinoSettings ? 
        JSON.parse(question.rhinoSettings) : 
        this.getDefaultRhinoSettings()
    };
  }

  private getDefaultRhinoSettings(): RhinoIntegrationConfig {
    return {
      enabled: true,
      autoLaunch: false,
      showViewport: true,
      batchMode: false
    };
  }
}
```

#### 4.4 Neuer GrasshopperFileService
```typescript
// server_nestjs/src/grasshopper-file/grasshopper-file.service.ts
@Injectable()
export class GrasshopperFileService {
  private readonly grasshopperBasePath = path.join(process.cwd(), 'files', 'Grasshopper');
  
  private readonly questionTypeMapping = {
    'MCSLIDER': 'Rahmen.gh',
    'GRAPH': 'Test.gh',
    'UML': 'example.gh',
    'CODE': 'example.gh'
  };

  constructor(private prisma: PrismaService) {}

  async resolveGrasshopperFilePath(context: RhinoExecutionContext): Promise<string> {
    // Level 1: Question-specific file
    if (context.questionId) {
      const question = await this.prisma.question.findUnique({
        where: { id: context.questionId },
        include: { grasshopperFile: true }
      });

      if (question?.grasshopperFile?.path) {
        return this.validateFilePath(question.grasshopperFile.path);
      }

      // Level 2: Question type mapping
      if (question?.type && this.questionTypeMapping[question.type]) {
        const filePath = path.join(this.grasshopperBasePath, this.questionTypeMapping[question.type]);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
    }

    // Level 3: Content element mapping (future extension)
    // TODO: Implement content-specific mapping

    // Level 4: Global fallback
    return path.join(this.grasshopperBasePath, 'example.gh');
  }

  async getAvailableGrasshopperFiles(): Promise<FileDto[]> {
    const files = await this.prisma.file.findMany({
      where: { 
        name: { endsWith: '.gh' },
        path: { contains: 'Grasshopper' }
      }
    });

    return files.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      createdAt: file.createdAt
    }));
  }

  async associateGrasshopperFileWithQuestion(
    questionId: number, 
    fileId: number
  ): Promise<void> {
    await this.prisma.question.update({
      where: { id: questionId },
      data: { grasshopperFileId: fileId }
    });
  }

  private validateFilePath(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Grasshopper file not found: ${filePath}`);
    }
    return filePath;
  }
}
```

#### 4.5 Rhino-Direct Service Anpassung
```typescript
// server_nestjs/src/rhino-direct/rhino-direct.service.ts
// Neue Methode hinzufügen:
async launchRhinoWithDynamicFile(
  context: RhinoExecutionContext,
  rhinoSettings?: RhinoIntegrationConfig
): Promise<DirectRhinoLaunchResponse> {
  const filePath = await this.grasshopperFileService.resolveGrasshopperFilePath(context);
  
  const request: DirectRhinoLaunchRequest = {
    filePath,
    showViewport: rhinoSettings?.showViewport ?? true,
    batchMode: rhinoSettings?.batchMode ?? false
  };

  console.log('🦏 Launching Rhino with dynamic file:', { context, filePath });
  
  return this.launchRhino(request);
}
```

#### 4.6 Controller-Erweiterung
```typescript
// server_nestjs/src/rhino-direct/rhino-direct.controller.ts
@Post('launch-dynamic')
async launchRhinoWithDynamicFile(
  @Body() body: DynamicGrasshopperRequest
): Promise<DirectRhinoLaunchResponse> {
  try {
    return await this.rhinoDirectService.launchRhinoWithDynamicFile(
      body.context,
      body.rhinoSettings
    );
  } catch (error) {
    console.error('❌ Dynamic Rhino launch failed:', error);
    throw new HttpException(
      `Dynamic Rhino launch failed: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
```

### Phase 3: Frontend Services (Woche 3)

#### 4.7 BatRhinoService Erweiterung
```typescript
// client_angular/src/app/Services/bat-rhino.service.ts
export class BatRhinoService {
  // Neue Methode für dynamische Grasshopper-Dateien
  createDynamicGrasshopperRequest(
    context: RhinoExecutionContext,
    rhinoSettings?: RhinoIntegrationConfig
  ): Observable<BatRhinoRequest> {
    const dynamicRequest: DynamicGrasshopperRequest = {
      context,
      rhinoSettings,
      fallbackEnabled: true
    };

    return this.http.post<{ filePath: string, rhinoSettings: RhinoIntegrationConfig }>(
      `${this.baseUrl}/resolve-grasshopper-file`,
      dynamicRequest
    ).pipe(
      map(response => this.createGrasshopperRequest(response.filePath, response.rhinoSettings)),
      catchError(error => {
        console.error('❌ Dynamic grasshopper request failed:', error);
        // Fallback to default file
        return of(this.createGrasshopperRequest(
          `${this.grasshopperBasePath}/example.gh`
        ));
      })
    );
  }

  executeDynamically(
    context: RhinoExecutionContext,
    rhinoSettings?: RhinoIntegrationConfig
  ): Observable<BatRhinoResponse> {
    const dynamicRequest: DynamicGrasshopperRequest = {
      context,
      rhinoSettings,
      fallbackEnabled: true
    };

    return this.http.post<BatRhinoResponse>(
      `${this.baseUrl}/launch-dynamic`,
      dynamicRequest
    ).pipe(
      tap(response => {
        console.log('🦏 Dynamic Rhino execution response:', response);
      }),
      catchError(error => {
        console.error('❌ Dynamic Rhino execution failed:', error);
        return throwError(error);
      })
    );
  }

  // Erweiterte Methode für Question-Context
  private createGrasshopperRequest(
    filePath: string, 
    rhinoSettings?: RhinoIntegrationConfig
  ): BatRhinoRequest {
    return {
      filePath,
      rhinoCommand: this.buildGrasshopperCommand(filePath, rhinoSettings),
      showViewport: rhinoSettings?.showViewport ?? true,
      batchMode: rhinoSettings?.batchMode ?? false
    };
  }

  private buildGrasshopperCommand(
    filePath: string, 
    settings?: RhinoIntegrationConfig
  ): string {
    const commands = ['_-Grasshopper'];
    
    if (settings?.batchMode !== false) {
      commands.push('B', 'D', 'W', 'L');
    }
    
    commands.push('W', 'H', 'D', 'O', `"${filePath}"`, 'W', 'H');
    
    if (settings?.showViewport !== false) {
      commands.push('_MaxViewport');
    }
    
    commands.push('_Enter');
    
    return commands.join(' ');
  }
}
```

#### 4.8 Neuer RhinoExecutionService
```typescript
// client_angular/src/app/Services/rhino-execution.service.ts
@Injectable({
  providedIn: 'root'
})
export class RhinoExecutionService {
  constructor(
    private batRhinoService: BatRhinoService,
    private rhinoFocusService: RhinoFocusService,
    private mcSliderRhinoIntegrationService: McSliderRhinoIntegrationService
  ) {}

  executeForContent(
    content: ContentDTO,
    contentElement?: ContentElementDTO,
    userId?: number
  ): Observable<BatRhinoResponse> {
    const context: RhinoExecutionContext = {
      contentId: content.id,
      contentElementId: contentElement?.id,
      questionId: contentElement?.question?.id,
      questionType: contentElement?.question?.type,
      userId,
      sessionId: this.generateSessionId()
    };

    console.log('🦏 Executing Rhino for content:', context);

    return this.batRhinoService.executeDynamically(context).pipe(
      tap(response => {
        if (response.success) {
          // Optional: Auto-focus after successful launch
          this.rhinoFocusService.focusFirstAvailableWindow().subscribe();
        }
      }),
      catchError(error => {
        console.error('❌ Rhino execution failed:', error);
        return throwError(error);
      })
    );
  }

  private generateSessionId(): string {
    return `rhino-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Phase 4: Component Integration (Woche 4)

#### 4.9 Content-List Component Anpassung
```typescript
// client_angular/src/app/Pages/content-list/content-list.component.ts
export class ContentListComponent implements OnInit, OnChanges {
  // Neue Dependency
  constructor(
    // ... existing dependencies
    private rhinoExecutionService: RhinoExecutionService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  // Ersetze die bestehende Methode
  onRhinoBatDirectButtonClick(content: ContentDTO, contentElement?: ContentElementDTO): void {
    console.log('🦏 Starting dynamic Rhino execution for content:', {
      contentId: content.id,
      contentElementId: contentElement?.id,
      questionId: contentElement?.question?.id
    });

    // Zeige Loading-Indikator
    this.snackBar.open('🦏 Rhino wird gestartet...', 'Schließen', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });

    this.userService.getCurrentUser().pipe(
      switchMap(user => 
        this.rhinoExecutionService.executeForContent(
          content,
          contentElement,
          user?.id
        )
      ),
      finalize(() => {
        // Verstecke Loading-Indikator
      })
    ).subscribe({
      next: (response) => {
        console.log('✅ Dynamic Rhino execution successful:', response);
        
        this.snackBar.open(
          `🦏 Rhino erfolgreich gestartet${contentElement?.question ? ` für Frage: ${contentElement.question.name}` : ''}`,
          'Schließen',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          }
        );
      },
      error: (error) => {
        console.error('❌ Dynamic Rhino execution failed:', error);
        
        this.snackBar.open(
          `❌ Rhino konnte nicht gestartet werden: ${error.message}`,
          'Schließen',
          {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          }
        );
      }
    });
  }

  // Neue Hilfsmethode für Debugging
  onRhinoDebugInfo(content: ContentDTO, contentElement?: ContentElementDTO): void {
    const context: RhinoExecutionContext = {
      contentId: content.id,
      contentElementId: contentElement?.id,
      questionId: contentElement?.question?.id,
      questionType: contentElement?.question?.type
    };

    console.log('🔍 Rhino Debug Info:', {
      context,
      hasQuestion: !!contentElement?.question,
      questionType: contentElement?.question?.type,
      questionId: contentElement?.question?.id
    });
  }
}
```

#### 4.10 HTML Template-Anpassung
```html
<!-- client_angular/src/app/Pages/content-list/content-list.component.html -->
<!-- Erweitere den bestehenden Rhino-Button -->
<button 
  mat-icon-button 
  (click)="onRhinoBatDirectButtonClick(content, contentElement)"
  [attr.aria-label]="'Rhino für ' + (contentElement?.question?.name || 'Content') + ' starten'"
  matTooltip="⚡ Rhino direkt ausführen mit aufgabenspezifischer Grasshopper-Datei"
  matTooltipPosition="above"
  style="color: #E91E63; font-weight: bold;"
  *ngIf="hasContentElementType(content, 'QUESTION')"
>
  <mat-icon>flash_on</mat-icon>
</button>

<!-- Optional: Debug-Button für Entwicklung -->
<button 
  mat-icon-button 
  (click)="onRhinoDebugInfo(content, contentElement)"
  matTooltip="🔍 Debug-Info für Rhino-Integration"
  *ngIf="!environment.production && hasContentElementType(content, 'QUESTION')"
  style="color: #FF9800; margin-left: 4px;"
>
  <mat-icon>bug_report</mat-icon>
</button>
```

### Phase 5: Testing & Qualitätssicherung (Woche 5)

#### 4.11 Unit Tests - Backend
```typescript
// server_nestjs/src/grasshopper-file/grasshopper-file.service.spec.ts
describe('GrasshopperFileService', () => {
  let service: GrasshopperFileService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GrasshopperFileService,
        { provide: PrismaService, useValue: mockPrismaService }
      ]
    }).compile();

    service = module.get<GrasshopperFileService>(GrasshopperFileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('resolveGrasshopperFilePath', () => {
    it('should resolve question-specific grasshopper file', async () => {
      // Mock question with grasshopper file
      const mockQuestion = {
        id: 1,
        type: 'MCSLIDER',
        grasshopperFile: {
          path: '/path/to/custom.gh'
        }
      };

      jest.spyOn(prismaService.question, 'findUnique').mockResolvedValue(mockQuestion);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const context: RhinoExecutionContext = { questionId: 1 };
      const result = await service.resolveGrasshopperFilePath(context);

      expect(result).toBe('/path/to/custom.gh');
    });

    it('should fall back to question type mapping', async () => {
      const mockQuestion = {
        id: 1,
        type: 'MCSLIDER',
        grasshopperFile: null
      };

      jest.spyOn(prismaService.question, 'findUnique').mockResolvedValue(mockQuestion);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const context: RhinoExecutionContext = { questionId: 1 };
      const result = await service.resolveGrasshopperFilePath(context);

      expect(result).toContain('Rahmen.gh');
    });

    it('should use global fallback for unknown question types', async () => {
      const mockQuestion = {
        id: 1,
        type: 'UNKNOWN',
        grasshopperFile: null
      };

      jest.spyOn(prismaService.question, 'findUnique').mockResolvedValue(mockQuestion);

      const context: RhinoExecutionContext = { questionId: 1 };
      const result = await service.resolveGrasshopperFilePath(context);

      expect(result).toContain('example.gh');
    });
  });
});
```

#### 4.12 Unit Tests - Frontend
```typescript
// client_angular/src/app/Services/rhino-execution.service.spec.ts
describe('RhinoExecutionService', () => {
  let service: RhinoExecutionService;
  let mockBatRhinoService: jasmine.SpyObj<BatRhinoService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('BatRhinoService', ['executeDynamically']);
    
    TestBed.configureTestingModule({
      providers: [
        RhinoExecutionService,
        { provide: BatRhinoService, useValue: spy }
      ]
    });

    service = TestBed.inject(RhinoExecutionService);
    mockBatRhinoService = TestBed.inject(BatRhinoService) as jasmine.SpyObj<BatRhinoService>;
  });

  it('should execute Rhino for content with question', () => {
    const mockContent: ContentDTO = { id: 1, title: 'Test Content' };
    const mockContentElement: ContentElementDTO = {
      id: 1,
      question: { id: 1, type: 'MCSLIDER', name: 'Test Question' }
    };
    const mockResponse: BatRhinoResponse = { success: true, message: 'Success' };

    mockBatRhinoService.executeDynamically.and.returnValue(of(mockResponse));

    service.executeForContent(mockContent, mockContentElement, 1).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    expect(mockBatRhinoService.executeDynamically).toHaveBeenCalledWith(
      jasmine.objectContaining({
        contentId: 1,
        contentElementId: 1,
        questionId: 1,
        questionType: 'MCSLIDER',
        userId: 1
      })
    );
  });
});
```

#### 4.13 Integration Tests
```typescript
// e2e/rhino-integration.e2e-spec.ts
describe('Dynamic Rhino Integration E2E', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  it('should launch Rhino with question-specific grasshopper file', async () => {
    // Create test question with grasshopper file
    const testFile = await prismaService.file.create({
      data: {
        name: 'test.gh',
        path: '/test/path/test.gh',
        type: 'grasshopper'
      }
    });

    const testQuestion = await prismaService.question.create({
      data: {
        name: 'Test Question',
        type: 'MCSLIDER',
        grasshopperFileId: testFile.id
      }
    });

    const dynamicRequest: DynamicGrasshopperRequest = {
      context: {
        questionId: testQuestion.id,
        questionType: 'MCSLIDER'
      },
      fallbackEnabled: true
    };

    return request(app.getHttpServer())
      .post('/api/rhino/launch-dynamic')
      .send(dynamicRequest)
      .expect(201)
      .expect(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.rhinoPath).toBeDefined();
      });
  });
});
```

### Phase 6: Admin Interface (Woche 6)

#### 4.14 Admin-Komponente für Grasshopper-File Management
```typescript
// client_angular/src/app/Pages/admin/grasshopper-file-management/grasshopper-file-management.component.ts
@Component({
  selector: 'app-grasshopper-file-management',
  templateUrl: './grasshopper-file-management.component.html',
  styleUrls: ['./grasshopper-file-management.component.scss']
})
export class GrasshopperFileManagementComponent implements OnInit {
  availableFiles: FileDto[] = [];
  questions: QuestionDTO[] = [];
  selectedQuestion: QuestionDTO | null = null;
  
  constructor(
    private grasshopperFileService: GrasshopperFileService,
    private questionDataService: QuestionDataService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAvailableFiles();
    this.loadQuestions();
  }

  loadAvailableFiles(): void {
    this.grasshopperFileService.getAvailableFiles().subscribe(files => {
      this.availableFiles = files;
    });
  }

  loadQuestions(): void {
    this.questionDataService.getAllQuestions().subscribe(questions => {
      this.questions = questions;
    });
  }

  associateFileWithQuestion(questionId: number, fileId: number): void {
    this.grasshopperFileService.associateFileWithQuestion(questionId, fileId)
      .subscribe({
        next: () => {
          this.snackBar.open('Grasshopper-Datei erfolgreich zugeordnet', 'Schließen', {
            duration: 3000
          });
          this.loadQuestions(); // Reload to show updated associations
        },
        error: (error) => {
          this.snackBar.open(`Fehler: ${error.message}`, 'Schließen', {
            duration: 5000
          });
        }
      });
  }
}
```

## 5. Sicherheitskonzepte

### 5.1 Eingabevalidierung
```typescript
// Validierung für DynamicGrasshopperRequest
export class DynamicGrasshopperRequestValidator {
  static validate(request: DynamicGrasshopperRequest): boolean {
    if (!request.context) {
      throw new Error('Context is required');
    }

    if (!request.context.questionId && !request.context.contentId) {
      throw new Error('Either questionId or contentId must be provided');
    }

    return true;
  }
}
```

### 5.2 Dateipfad-Sicherheit
```typescript
// Sicherheitsprüfungen für Dateipfade
export class FilePathSecurity {
  static validateGrasshopperPath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const allowedBasePath = path.join(process.cwd(), 'files', 'Grasshopper');
    
    // Verhindere Path Traversal
    if (!normalizedPath.startsWith(allowedBasePath)) {
      throw new Error('Invalid file path: outside allowed directory');
    }

    // Prüfe Dateierweiterung
    if (!normalizedPath.endsWith('.gh')) {
      throw new Error('Invalid file type: only .gh files allowed');
    }

    return true;
  }
}
```

## 6. Performance-Optimierungen

### 6.1 Caching-Strategie
```typescript
// Cache für Grasshopper-File-Auflösung
@Injectable()
export class GrasshopperFileCache {
  private cache = new Map<string, { path: string, expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

  getCachedPath(cacheKey: string): string | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.path;
    }
    return null;
  }

  setCachedPath(cacheKey: string, path: string): void {
    this.cache.set(cacheKey, {
      path,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }
}
```

### 6.2 Lazy Loading für Admin-Interface
```typescript
// Lazy Loading für Admin-Module
const routes: Routes = [
  {
    path: 'admin/grasshopper-management',
    loadChildren: () => import('./grasshopper-file-management/grasshopper-file-management.module')
      .then(m => m.GrasshopperFileManagementModule),
    canLoad: [AdminGuard]
  }
];
```

## 7. Monitoring und Logging

### 7.1 Structured Logging
```typescript
// Logger für Rhino-Integration
@Injectable()
export class RhinoIntegrationLogger {
  logGrasshopperFileResolution(
    questionId: number,
    resolvedPath: string,
    resolutionMethod: 'direct' | 'type-mapping' | 'fallback',
    userId?: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'grasshopper_file_resolved',
      questionId,
      resolvedPath: path.basename(resolvedPath), // Nur Dateiname für Sicherheit
      resolutionMethod,
      userId
    };

    console.log('🦏 Grasshopper File Resolution:', logEntry);
    
    // Optional: Send to monitoring service
    // this.monitoringService.logEvent(logEntry);
  }

  logRhinoExecution(
    context: RhinoExecutionContext,
    success: boolean,
    error?: string
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'rhino_execution',
      context,
      success,
      error
    };

    console.log('🦏 Rhino Execution Log:', logEntry);
  }
}
```

### 7.2 Metrics Collection
```typescript
// Metriken für Rhino-Integration
@Injectable()
export class RhinoMetricsService {
  private metrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    resolutionMethodCounts: {
      direct: 0,
      typeMapping: 0,
      fallback: 0
    }
  };

  recordExecution(success: boolean, resolutionMethod: string): void {
    this.metrics.totalExecutions++;
    
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    if (this.metrics.resolutionMethodCounts[resolutionMethod]) {
      this.metrics.resolutionMethodCounts[resolutionMethod]++;
    }
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100
    };
  }
}
```

## 8. Migration und Rollout

### 8.1 Migrationsstrategie
```typescript
// Migration-Script für bestehende Daten
export class GrasshopperFileMigration {
  async migrateExistingQuestions(): Promise<void> {
    const questions = await this.prisma.question.findMany();
    
    for (const question of questions) {
      const suggestedFilePath = this.getSuggestedFilePath(question.type);
      
      if (suggestedFilePath) {
        // Erstelle File-Eintrag falls nicht vorhanden
        const file = await this.findOrCreateGrasshopperFile(suggestedFilePath);
        
        // Verknüpfe mit Question
        await this.prisma.question.update({
          where: { id: question.id },
          data: { grasshopperFileId: file.id }
        });
      }
    }
  }

  private getSuggestedFilePath(questionType: string): string | null {
    const mapping = {
      'MCSLIDER': 'Rahmen.gh',
      'GRAPH': 'Test.gh',
      'UML': 'example.gh'
    };
    
    return mapping[questionType] || null;
  }
}
```

### 8.2 Feature Flags
```typescript
// Feature Flag für schrittweisen Rollout
@Injectable()
export class FeatureFlagService {
  private flags = {
    dynamicGrasshopperFiles: environment.production ? false : true,
    adminGrasshopperManagement: false,
    rhinoExecutionLogging: true
  };

  isEnabled(flag: string): boolean {
    return this.flags[flag] || false;
  }

  enableFlag(flag: string): void {
    this.flags[flag] = true;
  }
}
```

## 9. Dokumentation und Schulung

### 9.1 API-Dokumentation
```typescript
// OpenAPI/Swagger-Dokumentation
@ApiTags('Rhino Integration')
@Controller('rhino')
export class RhinoDirectController {
  @Post('launch-dynamic')
  @ApiOperation({ summary: 'Launch Rhino with dynamic grasshopper file' })
  @ApiBody({ type: DynamicGrasshopperRequest })
  @ApiResponse({ status: 201, description: 'Rhino launched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async launchRhinoWithDynamicFile(
    @Body() body: DynamicGrasshopperRequest
  ): Promise<DirectRhinoLaunchResponse> {
    // Implementation
  }
}
```

### 9.2 Benutzerhandbuch
```markdown
# Rhino-Integration: Dynamische Grasshopper-Dateien

## Für Administratoren

### Grasshopper-Dateien verwalten
1. Navigiere zu Admin → Grasshopper-Dateien
2. Lade neue .gh-Dateien hoch oder wähle bestehende aus
3. Ordne Dateien spezifischen Fragen zu

### Fallback-Konfiguration
- Fragen ohne spezifische Datei verwenden Type-Mapping
- Unbekannte Typen fallen zurück auf example.gh
- Systemweite Fallback-Konfiguration in Admin-Panel

## Für Entwickler

### Neue Fragetypen integrieren
1. Erweitere `questionTypeMapping` in `GrasshopperFileService`
2. Teste Fallback-Verhalten
3. Dokumentiere Type-Mapping

### Debugging
- Aktiviere Debug-Logs in `RhinoIntegrationLogger`
- Verwende Debug-Button in Content-List (Development)
- Überprüfe Metriken in Admin-Panel
```

## 10. Zeitplan und Meilensteine

### Woche 1: Infrastructure
- [ ] Database Schema Migration
- [ ] DTO-Erweiterungen
- [ ] Basis-Services (GrasshopperFileService)

### Woche 2: Backend Logic
- [ ] Question Data Service Erweiterung
- [ ] Rhino-Direct Service Anpassung
- [ ] Controller-Erweiterungen
- [ ] API-Endpunkte

### Woche 3: Frontend Services
- [ ] BatRhinoService Erweiterung
- [ ] RhinoExecutionService (neu)
- [ ] Service-Integration Tests

### Woche 4: Component Integration
- [ ] Content-List Component Update
- [ ] HTML Template Anpassungen
- [ ] User Experience Tests

### Woche 5: Testing & QA
- [ ] Unit Tests (Backend & Frontend)
- [ ] Integration Tests
- [ ] E2E Tests
- [ ] Performance Tests

### Woche 6: Admin Interface
- [ ] Grasshopper-File Management Component
- [ ] Admin-Routing
- [ ] Benutzerhandbuch

### Woche 7: Deployment & Monitoring
- [ ] Production Deployment
- [ ] Monitoring Setup
- [ ] Performance Monitoring
- [ ] User Training

## 11. Risiken und Mitigation

### Technische Risiken
| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| File Path Traversal | Mittel | Hoch | Strenge Pfad-Validierung |
| Performance-Degradation | Niedrig | Mittel | Caching, Lazy Loading |
| Backward Compatibility | Hoch | Mittel | Fallback-Mechanismen |

### Organisatorische Risiken
| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Komplexität für Admins | Mittel | Niedrig | Intuitive UI, Schulung |
| Datenverlust bei Migration | Niedrig | Hoch | Backup-Strategie |
| Unvollständige Tests | Mittel | Hoch | Umfassende Test-Suite |

## 12. Erfolgsmetriken

### Technische Metriken
- **Erfolgsrate**: >95% erfolgreiche Rhino-Starts
- **Performance**: <2s für File-Resolution
- **Fallback-Rate**: <10% Fallback-Nutzung

### Benutzermetriken
- **Adoption**: >80% der Fragen mit spezifischen Dateien
- **Fehlerrate**: <5% Benutzer-gemeldete Probleme
- **Zufriedenheit**: >4.5/5 in Benutzerumfragen

### Betriebsmetriken
- **Uptime**: >99.9% System-Verfügbarkeit
- **Response Time**: <500ms API-Antwortzeit
- **Resource Usage**: <10% CPU/Memory Increase

## 13. Nächste Schritte

1. **Stakeholder-Approval**: Vorlage dieses Plans zur Genehmigung
2. **Team-Briefing**: Entwicklungsteam über Implementierungsplan informieren
3. **Development Environment**: Testumgebung für neue Features einrichten
4. **Backup-Strategie**: Datensicherung vor Migration planen
5. **Monitoring Setup**: Logging- und Monitoring-Infrastruktur vorbereiten

## Anhang A: Technische Spezifikationen

### A.1 Systemanforderungen
- **Node.js**: >=16.0.0
- **Angular**: >=18.0.0
- **NestJS**: >=10.0.0
- **PostgreSQL**: >=14.0.0
- **Windows**: Required for Rhino integration

### A.2 Dateiformate
- **Grasshopper**: .gh files only
- **Unterstützte Pfade**: `/files/Grasshopper/*`
- **Max Dateigröße**: 50MB per .gh file

### A.3 Browser-Kompatibilität
- **Chrome**: >=90
- **Firefox**: >=88
- **Edge**: >=90
- **Safari**: >=14 (Limited Rhino support)

---

*Dieses Dokument wird kontinuierlich aktualisiert und versioniert. Aktuelle Version: 1.0*