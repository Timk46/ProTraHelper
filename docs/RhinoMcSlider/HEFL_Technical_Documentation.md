# HEFL Technical Documentation
## Hybrid E-Learning Framework - Complete Architecture Analysis

### Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Frontend Architecture (Angular)](#frontend-architecture-angular)
4. [Backend Architecture (NestJS)](#backend-architecture-nestjs)
5. [Type Safety & Shared Contracts](#type-safety--shared-contracts)
6. [Authentication & Security](#authentication--security)
7. [Core Learning Features](#core-learning-features)
8. [AI/ML Integration](#aiml-integration)
9. [Special Integrations](#special-integrations)
10. [Development Guidelines](#development-guidelines)
11. [Performance & Scalability](#performance--scalability)
12. [Security Considerations](#security-considerations)

---

## Executive Summary

**HEFL (Hybrid E-Learning Framework)** is a sophisticated, full-stack educational platform designed to support modern e-learning experiences with advanced features including AI-powered tutoring, interactive algorithm visualization, peer review systems, and seamless CAD integration. The platform demonstrates enterprise-level architecture patterns while maintaining educational focus.

### Key Technologies
- **Frontend**: Angular 18 with TypeScript, Material Design, Tailwind CSS
- **Backend**: NestJS with PostgreSQL, Prisma ORM
- **AI/ML**: OpenAI GPT-4, LangChain, LangGraph, Vector Database (pgvector)
- **Real-time**: Socket.io, WebSocket
- **Specialized**: Rhino/Grasshopper CAD integration, Sprotty graph visualization

### Architecture Highlights
- **Type-Safe Full Stack**: Shared DTOs ensure complete type safety across client-server communication
- **Multi-Modal Content**: Supports text, video, interactive code, algorithm visualization, and CAD integration
- **AI-Powered Learning**: Intelligent tutoring system with multi-agent architecture
- **Real-Time Collaboration**: WebSocket-based notifications and collaborative features
- **Comprehensive Security**: Multi-strategy authentication with JWT, CAS, and device-based session management

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HEFL Platform                                │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (Angular 18)              Backend (NestJS)                │
│  ├─ Pages (Smart Components)        ├─ Controllers (HTTP Layer)     │
│  ├─ Services (Business Logic)       ├─ Services (Business Logic)    │
│  ├─ Guards (Route Protection)       ├─ Guards (Auth & RBAC)         │
│  ├─ Interceptors (HTTP Middleware)  ├─ Interceptors (Global)        │
│  └─ Modules (Feature Separation)    └─ Modules (Feature Separation) │
├─────────────────────────────────────────────────────────────────────┤
│                    Shared Layer                                     │
│  ├─ DTOs (Type-Safe Contracts)                                     │
│  ├─ Interfaces (Data Structures)                                   │
│  └─ Enums (Constants)                                              │
├─────────────────────────────────────────────────────────────────────┤
│                 External Integrations                               │
│  ├─ Database (PostgreSQL + pgvector)                               │
│  ├─ AI Services (OpenAI, Cohere)                                   │
│  ├─ CAD Integration (Rhino/Grasshopper)                            │
│  ├─ Real-time (WebSocket)                                          │
│  └─ Authentication (CAS, JWT)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Communication Flow
1. **Frontend → Backend**: Type-safe HTTP requests with JWT authentication
2. **Backend → Database**: Prisma ORM for type-safe database operations
3. **Backend → AI Services**: LangChain orchestration for AI features
4. **Real-time Communication**: WebSocket for notifications and collaboration
5. **External Integration**: Rhino/Grasshopper via Windows process management

---

## Frontend Architecture (Angular)

### Module Structure

The Angular frontend follows a well-organized, modular architecture with clear separation of concerns:

```
src/app/
├── Pages/                  # Smart/Container Components
│   ├── dashboard/          # Main dashboard
│   ├── contentView/        # Content display system
│   ├── discussion/         # Forum functionality
│   ├── chat-bot/           # AI chatbot interface
│   ├── lecturersView/      # Content creation/editing
│   ├── admin/              # Administrative functions
│   └── graph/              # Knowledge graph visualization
├── Services/               # Business Logic Layer
│   ├── auth/               # Authentication & user management
│   ├── content/            # Content management
│   ├── discussion/         # Forum services
│   ├── ai/                 # AI integration services
│   ├── graph/              # Graph data & communication
│   └── websocket/          # Real-time communication
├── Modules/                # Feature Modules (Lazy Loaded)
│   ├── tutor-kai/          # AI tutoring system
│   ├── umlearn/            # UML diagram editor
│   ├── graph-tasks/        # Algorithm visualization
│   ├── code-game/          # Gamified programming
│   └── peer-review/        # Peer review system
├── Guards/                 # Route Protection
│   ├── is-logged-in.guard  # Authentication verification
│   ├── is-admin.guard      # Admin access control
│   └── registered-for-subject.guard # Subject enrollment
└── Interceptors/           # HTTP Middleware
    ├── auth-interceptor    # JWT token management
    └── version.interceptor # API versioning
```

### Key Frontend Patterns

#### 1. **Smart/Dumb Component Architecture**
- **Smart Components (Pages)**: Handle state, API calls, and business logic
- **Dumb Components**: Pure presentation components with @Input/@Output
- **Service Injection**: Only smart components inject services directly

#### 2. **Reactive Programming with RxJS**
- **Observable Streams**: All async operations use RxJS observables
- **Async Pipe**: Template async pipe for automatic subscription management
- **BehaviorSubjects**: Service-based state management for shared data

#### 3. **Type Safety**
- **Shared DTOs**: Complete type safety with backend contracts
- **Strict TypeScript**: Comprehensive type checking configuration
- **Interface Definitions**: Clear data structure definitions

#### 4. **Route Protection & Security**
- **Guard System**: Multi-layer route protection
- **JWT Management**: Automatic token refresh and validation
- **Role-Based Access**: Granular permission control

### Content Management System

The frontend supports diverse interactive content types:

#### Educational Content Types
- **Multiple Choice Questions**: Various formats (single, multiple, slider)
- **Code Exercises**: Monaco editor with language server integration
- **Algorithm Visualization**: Step-by-step graph algorithm execution
- **UML Diagrams**: Collaborative diagram creation and editing
- **Free Text**: Open-ended response with AI feedback
- **File Upload**: Assignment submission system
- **PDF/Video**: Rich media content display

#### Interactive Features
- **Real-time Feedback**: Immediate AI-powered responses
- **Progress Tracking**: Detailed learning analytics
- **Collaborative Editing**: Multi-user content creation
- **Discussion Forums**: Threaded discussions with voting

---

## Backend Architecture (NestJS)

### Modular Service Architecture

The NestJS backend implements a sophisticated modular architecture with clear separation of concerns:

```
src/
├── auth/                   # Authentication System
│   ├── strategies/         # Passport strategies (JWT, CAS, Local)
│   ├── guards/             # Auth guards and role validation
│   └── refresh-token/      # Token refresh management
├── users/                  # User management
├── content/                # Content management system
├── question-data/          # Question handling system
│   ├── question-data-choice/     # Multiple choice questions
│   ├── question-data-code/       # Code exercises
│   ├── question-data-graph/      # Graph algorithm questions
│   └── question-data-freetext/   # Free text questions
├── ai/                     # AI/ML Services
│   ├── chat-bot/           # Conversational AI
│   ├── feedback-generation/ # Automated feedback
│   └── services/           # Core AI services
├── tutor-kai/              # Advanced Tutoring System
│   ├── langgraph-feedback/ # Multi-agent tutoring
│   ├── run-code/           # Code execution
│   └── tutoring-feedback/  # Feedback orchestration
├── graph-solution-evaluation/ # Algorithm evaluation
│   ├── dijkstra/           # Shortest path algorithms
│   ├── floyd/              # All-pairs shortest path
│   ├── kruskal/            # Minimum spanning tree
│   └── ai-feedback/        # AI-powered algorithm feedback
├── discussion/             # Forum System
│   ├── discussion-creation/ # Forum post creation
│   ├── discussion-list/     # Forum browsing
│   ├── discussion-view/     # Thread viewing
│   └── discussion-vote/     # Voting system
├── notification/           # Real-time notifications
├── peer-review/            # Peer review system
├── rhino-direct/           # CAD integration
├── bat-rhino/              # Rhino script generation
└── files/                  # File management
```

### Service Layer Patterns

#### 1. **Controller-Service-Repository Pattern**
```typescript
// Controller Layer: HTTP Request Handling
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDTO> {
    return this.usersService.findById(parseInt(id));
  }
}

// Service Layer: Business Logic
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userSubjects: true }
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return this.transformToDTO(user);
  }
}
```

#### 2. **Database Access with Prisma**
```typescript
// Efficient batch operations
async getContentsByConceptNode(conceptNodeId: number, userId: number) {
  const conceptNode = await this.prisma.conceptNode.findUnique({
    where: { id: Number(conceptNodeId) },
    include: {
      requiredBy: { 
        select: { 
          contentNode: { 
            include: this.getContentNodeInclude() 
          } 
        } 
      },
      trainedBy: { 
        select: { 
          contentNode: { 
            include: this.getContentNodeInclude() 
          } 
        } 
      }
    }
  });

  // Single query for user progress
  const userStatus = await this.prisma.userContentElementProgress.findMany({
    where: { 
      userId, 
      contentElement: { 
        ContentView: { 
          some: { conceptNode: { id: conceptNodeId } } 
        } 
      } 
    }
  });
}
```

#### 3. **Dependency Injection & Modular Design**
```typescript
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => ContentModule)
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'USER_CONFIG',
      useValue: { maxLoginAttempts: 5 }
    }
  ],
  exports: [UsersService]
})
export class UsersModule {}
```

### API Design Principles

#### 1. **RESTful API Design**
- **Resource-based URLs**: `/api/users/:id`, `/api/content/:id`
- **HTTP Methods**: GET, POST, PUT, DELETE for CRUD operations
- **Status Codes**: Proper HTTP status code usage
- **Pagination**: Consistent pagination for list endpoints

#### 2. **Global Configuration**
```typescript
// Global JWT protection
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
}

// Global validation
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  })
);
```

---

## Type Safety & Shared Contracts

### DTO Architecture

The HEFL project implements a sophisticated type-safe contract system through shared DTOs:

```typescript
// shared/dtos/index.ts - Central Export
export * from './user.dto';
export * from './content.dto';
export * from './question.dto';
export * from './peer-review.dto';
export * from './rhino-window.dto';
```

### Frontend Integration
```typescript
// Angular Service with Type Safety
import { UserDTO, ContentDTO } from '@DTOs/index';

@Injectable()
export class ContentService {
  constructor(private http: HttpClient) {}

  getContent(id: number): Observable<ContentDTO> {
    return this.http.get<ContentDTO>(`/api/content/${id}`);
  }

  createContent(content: CreateContentDTO): Observable<ContentDTO> {
    return this.http.post<ContentDTO>('/api/content', content);
  }
}
```

### Backend Integration
```typescript
// NestJS Controller with Validation
export class CreateContentDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsInt()
  @Min(1)
  subjectId: number;
}

@Controller('content')
export class ContentController {
  @Post()
  async createContent(@Body() createDto: CreateContentDTO): Promise<ContentDTO> {
    return this.contentService.create(createDto);
  }
}
```

### Key DTO Categories

#### 1. **Core System DTOs**
- **UserDTO**: User management with role-based access
- **ContentDTO**: Learning content with hierarchical structure
- **QuestionDTO**: Multi-type question system
- **ProgressDTO**: Learning progress tracking

#### 2. **Specialized Feature DTOs**
- **PeerReviewDTO**: Peer review workflow management
- **RhinoWindowDTO**: CAD integration window management
- **ChatBotDTO**: Conversational AI interfaces
- **GraphQuestionDTO**: Algorithm visualization data

#### 3. **Validation Benefits**
- **Compile-time Safety**: TypeScript catches errors during development
- **Runtime Validation**: class-validator ensures data integrity
- **API Documentation**: DTOs serve as living documentation
- **Refactoring Safety**: Changes propagate across the entire stack

---

## Authentication & Security

### Multi-Strategy Authentication System

The HEFL platform implements a comprehensive authentication system with multiple strategies:

#### 1. **JWT-Based Authentication**
```typescript
// Token Structure
interface JWTPayload {
  sub: number;          // User ID
  email: string;        // User email
  globalRole: string;   // Global role (ADMIN, TEACHER, STUDENT)
  deviceId: string;     // Device identification
  iat: number;          // Issued at
  exp: number;          // Expiration
}

// Token Configuration
ACCESS_TOKEN_EXPIRES_IN: '2h'
REFRESH_TOKEN_EXPIRES_IN: '30d'
```

#### 2. **Authentication Strategies**

**Local Strategy** (Username/Password):
```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

**CAS Strategy** (University SSO):
```typescript
@Injectable()
export class CasStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      ssoBaseURL: 'https://sso.uni-siegen.de/cas',
      serverBaseURL: process.env.BACKEND_URL,
    });
  }

  async validate(profile: any, done: Function) {
    // Auto-create user from CAS profile
    const user = await this.authService.validateCasUser(profile);
    done(null, user);
  }
}
```

#### 3. **Security Flow**

**Authentication Flow**:
1. User submits credentials
2. Strategy validates credentials
3. JWT tokens generated (access + refresh)
4. Refresh token stored in database with device ID
5. Tokens returned to client
6. Client stores tokens in localStorage

**Token Refresh Flow**:
1. Access token expires (401 response)
2. Interceptor automatically triggers refresh
3. Refresh token validated against database
4. New tokens generated and stored
5. Original request retried with new token

#### 4. **Frontend Security Implementation**

**Authentication Interceptor**:
```typescript
@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add JWT token to all requests
    const token = this.userService.getAccessToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`,
          'Device-ID': this.userService.getDeviceId()
        }
      });
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error.status === 401) {
          // Automatic token refresh
          return this.handleTokenRefresh(request, next);
        }
        return throwError(error);
      })
    );
  }
}
```

**Route Guards**:
```typescript
@Injectable()
export class IsLoggedInGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(): boolean {
    if (this.userService.getAccessToken()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
```

#### 5. **Role-Based Access Control**

**Backend Role Validation**:
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = await this.userService.findById(request.user.sub);
    
    return requiredRoles.some(role => user.globalRole === role);
  }
}
```

**Usage Example**:
```typescript
@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles('ADMIN')
  async getUsers(): Promise<UserDTO[]> {
    return this.userService.findAll();
  }
}
```

#### 6. **Security Best Practices**

**Token Security**:
- Separate secrets for access and refresh tokens
- Short-lived access tokens (2 hours)
- Device-specific refresh tokens
- Secure token storage with bcrypt hashing

**Data Protection**:
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Security headers

**Session Management**:
- Multi-device support
- Selective logout (single device or all devices)
- Token cleanup with automated cron jobs
- Comprehensive audit logging

---

## Core Learning Features

### 1. **Content Management System**

#### Hierarchical Content Structure
```typescript
interface ContentHierarchy {
  Subject → ConceptNode → ContentNode → ContentElement → ContentView
}
```

**Content Types Supported**:
- **TEXT**: Rich text content with formatting
- **IMAGE**: Visual content with annotations
- **VIDEO**: Embedded video with progress tracking
- **AUDIO**: Audio content with transcripts
- **CODE**: Interactive code exercises
- **PDF**: PDF documents with highlighting
- **QUESTION**: Assessment questions

#### Content Creation & Editing
```typescript
// Content Creation Flow
async createContent(createDto: CreateContentDTO): Promise<ContentDTO> {
  // Validate user permissions
  await this.validateCreationPermissions(createDto.subjectId, userId);
  
  // Create content with proper structure
  const content = await this.prisma.contentNode.create({
    data: {
      ...createDto,
      createdBy: userId,
      contentElements: {
        create: createDto.elements.map(element => ({
          type: element.type,
          content: element.content,
          order: element.order
        }))
      }
    },
    include: this.getContentInclude()
  });
  
  return this.transformToDTO(content);
}
```

### 2. **Question System Architecture**

#### Multi-Type Question Support
The system supports diverse question types through a factory pattern:

```typescript
// Question Type Factory
async updateWholeQuestion(question: detailedQuestionDTO) {
  switch (question.type) {
    case questionType.FREETEXT:
      return await this.qdFreetext.updateFreeTextQuestion(question.freetextQuestion);
    case questionType.MULTIPLECHOICE:
      return await this.qdChoice.updateChoiceQuestion(question.mcQuestion);
    case questionType.CODE:
      return await this.qdCode.updateCodeQuestion(question.codeQuestion);
    case questionType.GRAPH:
      return await this.qdGraph.updateGraphQuestion(question.graphQuestion);
    case questionType.UML:
      return await this.qdUml.updateUmlQuestion(question.umlQuestion);
    default:
      throw new BadRequestException('Unsupported question type');
  }
}
```

#### Question Types in Detail

**Multiple Choice Questions**:
```typescript
interface McQuestionDTO {
  text: string;
  choices: McChoiceDTO[];
  multipleChoice: boolean;
  randomizeOrder: boolean;
  maxPoints: number;
  explanation?: string;
}
```

**Code Questions**:
```typescript
interface CodingQuestionDTO {
  description: string;
  language: ProgrammingLanguage;
  initialCode: string;
  testCases: TestCaseDTO[];
  hints: HintDTO[];
  allowedLibraries: string[];
}
```

**Graph Algorithm Questions**:
```typescript
interface GraphQuestionDTO {
  algorithmType: 'DIJKSTRA' | 'FLOYD' | 'KRUSKAL' | 'TRANSITIVE_CLOSURE';
  graph: GraphStructure;
  startNode?: number;
  endNode?: number;
  expectedSolution: any;
  stepByStep: boolean;
}
```

### 3. **Progress Tracking System**

#### Learning Analytics
```typescript
interface UserProgressDTO {
  userId: number;
  contentElementId: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;      // 0-100
  startedAt: Date;
  completedAt?: Date;
  attempts: number;
  bestScore: number;
  timeSpent: number;     // in seconds
}
```

#### Progress Calculation
```typescript
async calculateProgress(userId: number, subjectId: number): Promise<ProgressSummaryDTO> {
  const totalElements = await this.prisma.contentElement.count({
    where: { contentNode: { subject: { id: subjectId } } }
  });
  
  const completedElements = await this.prisma.userContentElementProgress.count({
    where: {
      userId,
      status: 'COMPLETED',
      contentElement: { contentNode: { subject: { id: subjectId } } }
    }
  });
  
  return {
    totalElements,
    completedElements,
    progressPercentage: (completedElements / totalElements) * 100,
    estimatedTimeToComplete: this.calculateEstimatedTime(userId, subjectId)
  };
}
```

### 4. **Assessment & Feedback System**

#### Automated Assessment
```typescript
async evaluateAnswer(submissionDto: AnswerSubmissionDTO): Promise<EvaluationResultDTO> {
  const question = await this.getQuestion(submissionDto.questionId);
  
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return this.evaluateMultipleChoice(submissionDto, question);
    case 'CODE':
      return this.evaluateCode(submissionDto, question);
    case 'GRAPH':
      return this.evaluateGraph(submissionDto, question);
    case 'FREETEXT':
      return this.evaluateFreetext(submissionDto, question);
    default:
      throw new BadRequestException('Unsupported question type for evaluation');
  }
}
```

#### Feedback Generation
```typescript
async generateFeedback(evaluation: EvaluationResultDTO): Promise<FeedbackDTO> {
  if (evaluation.score < 0.5) {
    // Generate remedial feedback
    return await this.generateRemedialFeedback(evaluation);
  } else if (evaluation.score >= 0.9) {
    // Generate advanced challenges
    return await this.generateAdvancedFeedback(evaluation);
  } else {
    // Generate improvement suggestions
    return await this.generateImprovementFeedback(evaluation);
  }
}
```

### 5. **Discussion Forum System**

#### Forum Architecture
```typescript
interface ForumStructure {
  Subject → Discussion → Messages → Votes/Replies
}
```

#### Discussion Features
- **Threaded Discussions**: Nested reply structure
- **Voting System**: Upvote/downvote for quality control
- **Anonymous Posting**: Optional anonymous participation
- **Moderation Tools**: Content management for instructors
- **Real-time Updates**: Live notification of new posts

#### Discussion Implementation
```typescript
async createDiscussion(createDto: CreateDiscussionDTO): Promise<DiscussionDTO> {
  const discussion = await this.prisma.discussion.create({
    data: {
      title: createDto.title,
      content: createDto.content,
      subjectId: createDto.subjectId,
      authorId: createDto.isAnonymous ? null : createDto.authorId,
      anonymousAuthorId: createDto.isAnonymous ? createDto.anonymousAuthorId : null,
      tags: createDto.tags
    },
    include: this.getDiscussionInclude()
  });
  
  // Trigger real-time notification
  await this.notificationService.notifyNewDiscussion(discussion);
  
  return this.transformToDTO(discussion);
}
```

---

## AI/ML Integration

### 1. **AI Architecture Overview**

The HEFL platform features a sophisticated AI/ML integration system designed to enhance learning experiences through intelligent tutoring, automated feedback, and conversational learning assistants.

#### Core AI Stack
```typescript
// AI Service Configuration
const AI_CONFIG = {
  primaryModel: 'gpt-4.1-2025-04-14',
  temperature: 0,                    // Deterministic responses
  embeddingModel: 'text-embedding-3-large',
  vectorDimensions: 3072,
  rerankModel: 'rerank-v3.5',
  relevanceThreshold: 0.4
};
```

### 2. **LLM Service Layer**

#### Basic LLM Service
```typescript
@Injectable()
export class LlmBasicPromptService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      model: 'gpt-4.1-2025-04-14',
      temperature: 0,
      streaming: true,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateLlmAnswer(prompt: string, userInput: string): Promise<string> {
    const messages = [
      new SystemMessage(prompt),
      new HumanMessage(userInput)
    ];
    
    const response = await this.llm.invoke(messages);
    return response.content;
  }

  async streamLlmAnswer(prompt: string, userInput: string, callbacks: any[]): Promise<void> {
    const messages = [
      new SystemMessage(prompt),
      new HumanMessage(userInput)
    ];
    
    await this.llm.invoke(messages, { callbacks });
  }
}
```

#### RAG (Retrieval Augmented Generation)
```typescript
@Injectable()
export class RagService {
  async lectureSimilaritySearch(query: string, k: number = 4): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.prisma.$queryRaw`
      SELECT content, transcript, similarity
      FROM transcript_embeddings
      ORDER BY embedding <-> ${queryEmbedding}::vector
      LIMIT ${k}
    `;
    
    return results.filter(result => result.similarity > 0.4);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }
}
```

### 3. **Conversational AI System**

#### ChatBot Architecture
```typescript
@Injectable()
export class ChatbotRagService {
  async chatBotRagAnswer(
    question: string, 
    userId: number, 
    sessionId?: string
  ): Promise<{ answer: string; sessionId: string }> {
    // Similarity search for relevant context
    const similaritySearchResult = await this.ragService.lectureSimilaritySearch(question, 4);
    
    // Build context-aware prompt
    const ragFormattedPrompt = this.buildRAGPrompt(question, similaritySearchResult);
    
    // Generate streaming response
    const response = await this.llmService.streamLlmAnswer(
      ragFormattedPrompt, 
      question,
      [this.createStreamingCallback(userId, sessionId)]
    );
    
    // Process citations and create session
    const processedResponse = this.processCitations(response, similaritySearchResult);
    const newSessionId = sessionId || await this.createChatSession(userId, question);
    
    return { answer: processedResponse, sessionId: newSessionId };
  }

  private buildRAGPrompt(question: string, context: any[]): string {
    const contextText = context.map(item => item.content).join('\n');
    
    return `
      You are an educational assistant. Use the following context to answer the question.
      
      Context:
      ${contextText}
      
      Instructions:
      - Provide accurate, educational responses
      - Cite sources using $$number$$ format
      - If context doesn't contain relevant information, say so
      - Keep responses concise and student-friendly
      
      Question: ${question}
    `;
  }
}
```

### 4. **Multi-Agent Tutoring System (Tutor-Kai)**

#### LangGraph Architecture
The system implements a sophisticated multi-agent tutoring framework using LangGraph:

```typescript
// Supervisor Workflow
@Injectable()
export class SupervisorWorkflow {
  private graph: StateGraph;

  constructor() {
    this.graph = new StateGraph(TutorKaiState)
      .addNode('format_input', this.formatInput.bind(this))
      .addNode('route_question', this.routeQuestion.bind(this))
      .addNode('kc_agent', this.kcAgent.bind(this))
      .addNode('kh_agent', this.khAgent.bind(this))
      .addNode('km_agent', this.kmAgent.bind(this))
      .addNode('ktc_agent', this.ktcAgent.bind(this))
      .addNode('generate_response', this.generateResponse.bind(this))
      .addEdge('format_input', 'route_question')
      .addConditionalEdges('route_question', this.routeDecision.bind(this))
      .addEdge(['kc_agent', 'kh_agent', 'km_agent', 'ktc_agent'], 'generate_response');
  }

  private async routeDecision(state: TutorKaiState): Promise<string> {
    const { question, context } = state;
    
    // Intelligent routing based on question type
    if (this.isConceptualQuestion(question)) return 'kc_agent';
    if (this.isProceduralQuestion(question)) return 'kh_agent';
    if (this.containsErrors(context)) return 'km_agent';
    if (this.hasConstraints(context)) return 'ktc_agent';
    
    return 'kc_agent'; // Default to conceptual agent
  }
}
```

#### Specialized Agents

**KC Agent (Knowledge about Concepts)**:
```typescript
@Injectable()
export class KcAgent {
  async processConceptualQuestion(state: TutorKaiState): Promise<TutorKaiState> {
    const { question, code, context } = state;
    
    // Extract concepts from question
    const concepts = await this.extractConcepts(question, code);
    
    // Retrieve domain knowledge
    const domainKnowledge = await this.domainKnowledgeTool.invoke({
      query: concepts.join(' '),
      context: context
    });
    
    // Generate conceptual explanation
    const explanation = await this.generateConceptualExplanation(
      question, 
      concepts, 
      domainKnowledge
    );
    
    return {
      ...state,
      concepts,
      explanation,
      citations: this.extractCitations(domainKnowledge)
    };
  }
}
```

**KH Agent (Knowledge about How to proceed)**:
```typescript
@Injectable()
export class KhAgent {
  async processProceduralQuestion(state: TutorKaiState): Promise<TutorKaiState> {
    const { question, code, context } = state;
    
    // Analyze current code state
    const codeAnalysis = await this.analyzeCode(code);
    
    // Generate step-by-step guidance
    const steps = await this.generateSteps(question, codeAnalysis);
    
    // Create procedural guidance
    const guidance = await this.generateProcedualGuidance(steps, context);
    
    return {
      ...state,
      steps,
      guidance,
      nextActions: this.suggestNextActions(codeAnalysis)
    };
  }
}
```

### 5. **Automated Feedback Generation**

#### Feedback Service Architecture
```typescript
@Injectable()
export class FeedbackGenerationService {
  async generateFreetextFeedback(
    question: freeTextQuestionDTO,
    userAnswer: string
  ): Promise<FeedbackResultDTO> {
    const prompt = this.buildFeedbackPrompt(question, userAnswer);
    
    const llmResponse = await this.llmService.generateLlmAnswer(prompt, userAnswer);
    
    // Extract scoring from response
    const scoreMatch = llmResponse.match(/Erreichte Punktzahl: (\d+([.,]\d+)?)/);
    const reachedPoints = scoreMatch ? parseFloat(scoreMatch[1].replace(/,/g, '.')) : 0;
    
    return {
      feedbackText: llmResponse,
      reachedPoints,
      maxPoints: question.maxPoints,
      suggestions: this.extractSuggestions(llmResponse)
    };
  }

  private buildFeedbackPrompt(question: freeTextQuestionDTO, answer: string): string {
    return `
      Sie sind ein erfahrener Dozent. Bewerten Sie die folgende Antwort:
      
      Frage: ${question.text}
      Maximale Punktzahl: ${question.maxPoints}
      Erwartete Antwort: ${question.exampleSolution}
      Bewertungskriterien: ${question.expectations}
      
      Studentenantwort: ${answer}
      
      Bewertung:
      - Geben Sie konstruktives Feedback
      - Erklären Sie Stärken und Schwächen
      - Geben Sie die erreichte Punktzahl an: "Erreichte Punktzahl: X"
      - Bieten Sie Verbesserungsvorschläge
    `;
  }
}
```

### 6. **Graph Algorithm AI Feedback**

#### Algorithm Evaluation with AI
```typescript
@Injectable()
export class AiFeedbackService {
  async generateGraphFeedback(
    algorithm: 'DIJKSTRA' | 'FLOYD' | 'KRUSKAL',
    userSolution: any,
    correctSolution: any
  ): Promise<GraphFeedbackDTO> {
    const semanticAnalysis = this.convertToSemantic(userSolution, correctSolution);
    
    const prompt = this.buildGraphFeedbackPrompt(algorithm, semanticAnalysis);
    
    const feedback = await this.llmService.generateLlmAnswer(prompt, '');
    
    return {
      feedback,
      algorithm,
      correctSteps: this.identifyCorrectSteps(userSolution, correctSolution),
      incorrectSteps: this.identifyIncorrectSteps(userSolution, correctSolution),
      suggestions: this.generateSuggestions(algorithm, semanticAnalysis)
    };
  }

  private convertToSemantic(userSolution: any, correctSolution: any): string {
    // Convert graph structures to natural language
    const userDescription = this.describeGraphSolution(userSolution);
    const correctDescription = this.describeGraphSolution(correctSolution);
    
    return `
      Benutzer-Lösung: ${userDescription}
      Korrekte Lösung: ${correctDescription}
      Unterschiede: ${this.identifyDifferences(userSolution, correctSolution)}
    `;
  }
}
```

### 7. **AI Performance & Monitoring**

#### LangSmith Integration
```typescript
@Injectable()
export class LangSmithService {
  private tracer: LangSmithTracer;

  constructor() {
    this.tracer = new LangSmithTracer({
      projectName: 'hefl-ai-tutoring',
      apiKey: process.env.LANGCHAIN_API_KEY
    });
  }

  async traceAIInteraction(
    operation: string,
    input: any,
    output: any,
    metadata: any
  ): Promise<void> {
    await this.tracer.trace({
      name: operation,
      input,
      output,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userId: metadata.userId
      }
    });
  }
}
```

#### AI Quality Monitoring
```typescript
@Injectable()
export class AIQualityService {
  async collectFeedbackRating(
    interactionId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await this.prisma.aiFeedbackRating.create({
      data: {
        interactionId,
        rating,
        comment,
        timestamp: new Date()
      }
    });
    
    // Trigger quality analysis if rating is low
    if (rating <= 2) {
      await this.analyzeQualityIssue(interactionId);
    }
  }

  async generateQualityReport(): Promise<QualityReportDTO> {
    const ratings = await this.prisma.aiFeedbackRating.findMany({
      where: { 
        timestamp: { 
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    
    return {
      averageRating: this.calculateAverageRating(ratings),
      totalInteractions: ratings.length,
      qualityTrends: this.analyzeQualityTrends(ratings),
      commonIssues: this.identifyCommonIssues(ratings)
    };
  }
}
```

---

## Special Integrations

### 1. **Rhino/Grasshopper CAD Integration**

The HEFL platform features sophisticated CAD integration through two complementary systems designed to bridge web-based learning with desktop CAD applications.

#### A. BAT-Rhino Integration System

**Architecture Overview**:
```typescript
@Injectable()
export class BatScriptGeneratorService {
  async generateBatScript(
    fileUrl: string,
    commands: string[],
    userId: number
  ): Promise<BatScriptDTO> {
    // Validate and sanitize inputs
    const validatedCommands = this.validateCommands(commands);
    const sanitizedUrl = this.sanitizeUrl(fileUrl);
    
    // Generate personalized script
    const script = this.buildBatScript(sanitizedUrl, validatedCommands);
    
    // Create registry entries for protocol handler
    const registryEntries = this.generateRegistryEntries();
    
    return {
      script,
      registryEntries,
      downloadUrl: await this.createDownloadPackage(script, registryEntries),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private buildBatScript(fileUrl: string, commands: string[]): string {
    return `
      @echo off
      echo HEFL - ProTra Rhino Integration
      echo Initializing Rhino with Grasshopper...
      
      REM Detect Rhino installation
      ${this.generateRhinoDetection()}
      
      REM Download and verify file
      ${this.generateFileDownload(fileUrl)}
      
      REM Execute Rhino with parameters
      ${this.generateRhinoExecution(commands)}
      
      REM Cleanup temporary files
      ${this.generateCleanup()}
    `;
  }
}
```

**Registry Integration**:
```typescript
private generateRegistryEntries(): string {
  return `
    Windows Registry Editor Version 5.00

    [HKEY_CURRENT_USER\\Software\\Classes\\protra-rhino]
    @="ProTra Rhino Protocol"
    "URL Protocol"=""

    [HKEY_CURRENT_USER\\Software\\Classes\\protra-rhino\\DefaultIcon]
    @="rhino.exe,1"

    [HKEY_CURRENT_USER\\Software\\Classes\\protra-rhino\\shell]

    [HKEY_CURRENT_USER\\Software\\Classes\\protra-rhino\\shell\\open]

    [HKEY_CURRENT_USER\\Software\\Classes\\protra-rhino\\shell\\open\\command]
    @="\\"${process.env.HEFL_SCRIPTS_PATH}\\\\rhino-launcher.bat\\" \\"%1\\""
  `;
}
```

#### B. Rhino-Direct Integration System

**Windows Process Management**:
```typescript
@Injectable()
export class RhinoDirectService {
  async launchRhinoWithFile(
    filePath: string,
    options: RhinoLaunchOptions
  ): Promise<RhinoProcessDTO> {
    const rhinoPath = await this.detectRhinoInstallation();
    
    if (!rhinoPath) {
      throw new NotFoundException('Rhino installation not found');
    }
    
    const process = spawn(rhinoPath, [
      filePath,
      ...options.additionalArgs
    ], {
      detached: true,
      stdio: 'ignore'
    });
    
    const windowInfo = await this.waitForWindow(process.pid);
    
    return {
      processId: process.pid,
      windowHandle: windowInfo.handle,
      isActive: true,
      startTime: new Date()
    };
  }

  private async detectRhinoInstallation(): Promise<string | null> {
    // Try registry detection first
    const registryPath = await this.queryRegistry(
      'HKEY_LOCAL_MACHINE\\SOFTWARE\\McNeel\\Rhinoceros\\7.0\\Install',
      'InstallPath'
    );
    
    if (registryPath) {
      return path.join(registryPath, 'System', 'Rhino.exe');
    }
    
    // Fallback to common installation paths
    const commonPaths = [
      'C:\\Program Files\\Rhino 7\\System\\Rhino.exe',
      'C:\\Program Files\\Rhino 8\\System\\Rhino.exe',
      'C:\\Program Files (x86)\\Rhino 7\\System\\Rhino.exe'
    ];
    
    for (const path of commonPaths) {
      if (await this.fileExists(path)) {
        return path;
      }
    }
    
    return null;
  }
}
```

#### C. Window Management System

**Advanced Window Control**:
```typescript
@Injectable()
export class RhinoWindowManagerService {
  async focusRhinoWindow(windowHandle: string): Promise<FocusResultDTO> {
    const powershellScript = `
      Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern bool SetForegroundWindow(IntPtr hWnd);
          [DllImport("user32.dll")]
          public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
      '
      
      $handle = [IntPtr]::new(${windowHandle})
      $result = [Win32]::ShowWindow($handle, 9)  # SW_RESTORE
      $result = [Win32]::SetForegroundWindow($handle)
      
      Write-Output $result
    `;
    
    const result = await this.executePowerShell(powershellScript);
    
    return {
      success: result.trim() === 'True',
      windowHandle,
      timestamp: new Date()
    };
  }

  async minimizeRhinoWindow(windowHandle: string): Promise<boolean> {
    const script = `
      Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
      '
      
      $handle = [IntPtr]::new(${windowHandle})
      [Win32]::ShowWindow($handle, 2)  # SW_MINIMIZE
    `;
    
    const result = await this.executePowerShell(script);
    return result.trim() === 'True';
  }
}
```

### 2. **Real-Time Communication System**

#### WebSocket Gateway Architecture

**Notification Gateway**:
```typescript
@WebSocketGateway(3100, {
  namespace: '/notifications',
  cors: { origin: '*' }
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, Set<string>>();

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // Authenticate WebSocket connection
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);
      
      // Store user-socket mapping
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);
      
      client.data.userId = user.id;
      client.join(`user-${user.id}`);
      
      this.logger.log(`User ${user.id} connected via WebSocket`);
      
      // Send pending notifications
      await this.sendPendingNotifications(user.id, client);
      
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`User ${userId} disconnected from WebSocket`);
  }
}
```

#### Notification Service

**Real-Time Notification Delivery**:
```typescript
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway
  ) {}

  async createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ): Promise<NotificationDTO> {
    // Store notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        isRead: false,
        createdAt: new Date()
      }
    });

    // Send real-time notification
    await this.notificationGateway.sendNotificationToUser(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.createdAt,
      metadata: notification.metadata
    });

    return this.transformToDTO(notification);
  }

  async broadcastToSubject(
    subjectId: number,
    notification: BroadcastNotificationDTO
  ): Promise<void> {
    // Get all users in subject
    const users = await this.prisma.userSubject.findMany({
      where: { subjectId },
      include: { user: true }
    });

    // Batch create notifications
    const notifications = await this.prisma.notification.createMany({
      data: users.map(userSubject => ({
        userId: userSubject.user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata || {}
      }))
    });

    // Send real-time notifications
    await Promise.all(
      users.map(userSubject => 
        this.notificationGateway.sendNotificationToUser(
          userSubject.user.id,
          notification
        )
      )
    );
  }
}
```

### 3. **Peer Review System**

#### Comprehensive Review Workflow

**Session Management**:
```typescript
@Injectable()
export class PeerReviewSessionService {
  async createSession(createDto: CreatePeerReviewSessionDTO): Promise<PeerReviewSessionDTO> {
    const session = await this.prisma.peerReviewSession.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        subjectId: createDto.subjectId,
        submissionDeadline: createDto.submissionDeadline,
        reviewDeadline: createDto.reviewDeadline,
        maxReviewsPerSubmission: createDto.maxReviewsPerSubmission,
        isAnonymous: createDto.isAnonymous,
        status: 'CREATED',
        createdBy: createDto.userId
      }
    });
    
    return this.transformToDTO(session);
  }

  async advanceToReviewPhase(sessionId: string): Promise<void> {
    const session = await this.prisma.peerReviewSession.findUnique({
      where: { id: sessionId },
      include: { submissions: true }
    });
    
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    
    if (session.status !== 'SUBMISSION_OPEN') {
      throw new BadRequestException('Session is not in submission phase');
    }
    
    // Assign anonymous reviewers
    await this.assignAnonymousReviewers(session);
    
    // Update session status
    await this.prisma.peerReviewSession.update({
      where: { id: sessionId },
      data: { status: 'REVIEW_OPEN' }
    });
    
    // Notify participants
    await this.notifyReviewPhaseStart(session);
  }

  private async assignAnonymousReviewers(session: PeerReviewSession): Promise<void> {
    const submissions = await this.prisma.peerSubmission.findMany({
      where: { sessionId: session.id }
    });
    
    for (const submission of submissions) {
      // Get potential reviewers (excluding the author)
      const potentialReviewers = await this.getPotentialReviewers(
        session.subjectId,
        submission.authorId
      );
      
      // Randomly assign reviewers
      const selectedReviewers = this.randomlySelectReviewers(
        potentialReviewers,
        session.maxReviewsPerSubmission
      );
      
      // Create review assignments
      await this.createReviewAssignments(submission.id, selectedReviewers);
    }
  }
}
```

#### Review Management

**Review Submission & Validation**:
```typescript
@Injectable()
export class PeerReviewService {
  async submitReview(
    submissionId: string,
    reviewerId: number,
    reviewData: SubmitReviewDTO
  ): Promise<PeerReviewDTO> {
    // Validate review eligibility
    await this.validateReviewEligibility(submissionId, reviewerId);
    
    // Prevent duplicate reviews
    const existingReview = await this.prisma.peerReview.findFirst({
      where: { submissionId, reviewerId }
    });
    
    if (existingReview) {
      throw new BadRequestException('Review already submitted');
    }
    
    // Create review
    const review = await this.prisma.peerReview.create({
      data: {
        submissionId,
        reviewerId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        feedback: reviewData.feedback,
        suggestions: reviewData.suggestions,
        isComplete: true,
        submittedAt: new Date()
      }
    });
    
    // Check if all reviews are complete
    await this.checkReviewCompletion(submissionId);
    
    return this.transformToDTO(review);
  }

  private async validateReviewEligibility(
    submissionId: string,
    reviewerId: number
  ): Promise<void> {
    const submission = await this.prisma.peerSubmission.findUnique({
      where: { id: submissionId },
      include: { session: true }
    });
    
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    
    // Check if reviewer is assigned to this submission
    const assignment = await this.prisma.reviewAssignment.findFirst({
      where: { submissionId, reviewerId }
    });
    
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to review this submission');
    }
    
    // Check if review deadline has passed
    if (new Date() > submission.session.reviewDeadline) {
      throw new BadRequestException('Review deadline has passed');
    }
    
    // Ensure reviewer is not the author
    if (submission.authorId === reviewerId) {
      throw new BadRequestException('Cannot review your own submission');
    }
  }
}
```

### 4. **Advanced File Management**

#### Multi-Service File Architecture

**Core File Service**:
```typescript
@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: number,
    metadata?: FileMetadata
  ): Promise<FileDTO> {
    const fileUuid = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileUuid}${fileExtension}`;
    const filePath = path.join(this.getUploadDirectory(), fileName);
    
    // Validate file type and size
    await this.validateFile(file);
    
    // Save file to filesystem
    await this.saveFile(file.buffer, filePath);
    
    // Create database record
    const fileRecord = await this.prisma.file.create({
      data: {
        uuid: fileUuid,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        metadata: metadata || {},
        createdAt: new Date()
      }
    });
    
    return this.transformToDTO(fileRecord);
  }

  async getFile(uuid: string): Promise<FileStreamDTO> {
    const file = await this.prisma.file.findUnique({
      where: { uuid }
    });
    
    if (!file) {
      throw new NotFoundException('File not found');
    }
    
    const filePath = path.join(this.getUploadDirectory(), file.fileName);
    
    if (!await this.fileExists(filePath)) {
      throw new NotFoundException('File not found on filesystem');
    }
    
    return {
      stream: fs.createReadStream(filePath),
      mimeType: file.mimeType,
      size: file.size,
      originalName: file.originalName
    };
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
    const allowedTypes = this.configService.get<string[]>('ALLOWED_FILE_TYPES', [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'text/plain',
      'application/zip'
    ]);
    
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSize} bytes`);
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }
}
```

#### Production File Management

**Specialized Production Files**:
```typescript
@Injectable()
export class ProductionFilesService {
  async getProductionFile(filename: string): Promise<FileStreamDTO> {
    const filePath = path.join(this.getProductionDirectory(), filename);
    
    // Security: Prevent directory traversal
    if (!this.isPathSafe(filePath)) {
      throw new ForbiddenException('Invalid file path');
    }
    
    if (!await this.fileExists(filePath)) {
      throw new NotFoundException('Production file not found');
    }
    
    const stats = await fs.stat(filePath);
    const mimeType = this.getMimeType(filename);
    
    return {
      stream: fs.createReadStream(filePath),
      mimeType,
      size: stats.size,
      originalName: filename
    };
  }

  private isPathSafe(filePath: string): boolean {
    const productionDir = this.getProductionDirectory();
    const resolvedPath = path.resolve(filePath);
    const resolvedProductionDir = path.resolve(productionDir);
    
    return resolvedPath.startsWith(resolvedProductionDir);
  }

  private getMimeType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.3dm': 'application/octet-stream' // Rhino files
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
}
```

### 5. **Graph Visualization with Sprotty**

#### Interactive Diagram Framework

**Sprotty Integration**:
```typescript
// Custom Sprotty Configuration
export const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
  rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
  rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
  
  // Custom model source
  bind(TYPES.ModelSource).to(HeflModelSource).inSingletonScope();
  
  // Custom action handlers
  bind(TYPES.IActionHandler).to(HeflActionHandler);
  bind(TYPES.IActionHandler).to(TouchEventActionHandler);
  
  // Custom views
  configureViewerOptions(bind, {
    needsClientLayout: true,
    needsServerLayout: true,
    baseDiv: 'sprotty-graph',
    hiddenDiv: 'sprotty-hidden'
  });
});
```

**Graph Component Integration**:
```typescript
@Component({
  selector: 'app-graph',
  template: `
    <div #sprottyContainer class="sprotty-container">
      <div id="sprotty-graph" class="sprotty-graph"></div>
      <div id="sprotty-hidden" class="sprotty-hidden"></div>
    </div>
  `
})
export class GraphComponent implements OnInit, OnDestroy {
  private diagramServer: LocalModelSource;
  private actionDispatcher: ActionDispatcher;
  
  ngOnInit() {
    const container = createContainer(diagramModule);
    this.diagramServer = container.get<LocalModelSource>(TYPES.ModelSource);
    this.actionDispatcher = container.get<ActionDispatcher>(TYPES.IActionDispatcher);
    
    // Load initial graph data
    this.loadGraph();
  }
  
  private async loadGraph() {
    const graphData = await this.graphService.getGraphData();
    const model = this.transformToSprottyModel(graphData);
    
    this.diagramServer.updateModel(model);
  }
  
  private transformToSprottyModel(data: any): SModelRoot {
    return {
      type: 'graph',
      id: 'root',
      children: [
        ...data.nodes.map(node => ({
          type: 'concept-node',
          id: node.id,
          position: { x: node.x, y: node.y },
          size: { width: 120, height: 80 },
          label: node.name,
          expanded: node.expanded || false
        })),
        ...data.edges.map(edge => ({
          type: 'edge',
          id: edge.id,
          sourceId: edge.source,
          targetId: edge.target,
          routingPoints: edge.routingPoints || []
        }))
      ]
    };
  }
}
```

---

## Development Guidelines

### 1. **Code Style & Conventions**

#### TypeScript Best Practices

**Strict Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Naming Conventions**:
- **Classes, Interfaces, Types**: `UpperCamelCase`
- **Functions, Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.type.ts`
- **Observables**: `name$` (with dollar suffix)
- **Private members**: `camelCase` with `private` keyword

#### Angular-Specific Patterns

**Component Architecture**:
```typescript
// Smart Component Pattern
@Component({
  selector: 'app-content-view',
  template: `
    <app-content-display 
      [content]="content$ | async"
      [userProgress]="progress$ | async"
      (contentComplete)="onContentComplete($event)">
    </app-content-display>
  `
})
export class ContentViewComponent implements OnInit, OnDestroy {
  content$ = this.contentService.getContent(this.route.snapshot.params.id);
  progress$ = this.progressService.getProgress(this.route.snapshot.params.id);
  
  constructor(
    private contentService: ContentService,
    private progressService: ProgressService,
    private route: ActivatedRoute
  ) {}
  
  onContentComplete(contentId: number): void {
    this.progressService.markComplete(contentId).subscribe();
  }
}
```

**Service Pattern**:
```typescript
// Injectable Service with Error Handling
@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private apiUrl = '/api/content';
  
  constructor(private http: HttpClient) {}
  
  getContent(id: number): Observable<ContentDTO> {
    return this.http.get<ContentDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching content:', error);
        return throwError(() => new Error('Failed to load content'));
      })
    );
  }
}
```

#### NestJS Best Practices

**Controller Pattern**:
```typescript
@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}
  
  @Get(':id')
  async getContent(@Param('id', ParseIntPipe) id: number): Promise<ContentDTO> {
    return this.contentService.findById(id);
  }
  
  @Post()
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  async createContent(@Body() createDto: CreateContentDTO): Promise<ContentDTO> {
    return this.contentService.create(createDto);
  }
}
```

**Service Pattern**:
```typescript
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}
  
  async findById(id: number): Promise<ContentDTO> {
    const content = await this.prisma.contentNode.findUnique({
      where: { id },
      include: {
        contentElements: true,
        subject: true,
        createdBy: true
      }
    });
    
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }
    
    return this.transformToDTO(content);
  }
  
  private transformToDTO(content: any): ContentDTO {
    return {
      id: content.id,
      title: content.title,
      description: content.description,
      elements: content.contentElements.map(el => ({
        id: el.id,
        type: el.type,
        content: el.content,
        order: el.order
      })),
      subject: {
        id: content.subject.id,
        name: content.subject.name
      },
      createdBy: {
        id: content.createdBy.id,
        name: content.createdBy.firstname + ' ' + content.createdBy.lastname
      }
    };
  }
}
```

### 2. **Testing Strategy**

#### Unit Testing

**Angular Component Testing**:
```typescript
describe('ContentViewComponent', () => {
  let component: ContentViewComponent;
  let fixture: ComponentFixture<ContentViewComponent>;
  let contentService: jasmine.SpyObj<ContentService>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('ContentService', ['getContent']);
    
    TestBed.configureTestingModule({
      declarations: [ContentViewComponent],
      providers: [
        { provide: ContentService, useValue: spy }
      ]
    });
    
    fixture = TestBed.createComponent(ContentViewComponent);
    component = fixture.componentInstance;
    contentService = TestBed.inject(ContentService) as jasmine.SpyObj<ContentService>;
  });
  
  it('should load content on init', () => {
    const mockContent: ContentDTO = { id: 1, title: 'Test Content' };
    contentService.getContent.and.returnValue(of(mockContent));
    
    component.ngOnInit();
    
    expect(contentService.getContent).toHaveBeenCalledWith(1);
    component.content$.subscribe(content => {
      expect(content).toEqual(mockContent);
    });
  });
});
```

**NestJS Service Testing**:
```typescript
describe('ContentService', () => {
  let service: ContentService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: {
            contentNode: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn()
            }
          }
        }
      ]
    }).compile();
    
    service = module.get<ContentService>(ContentService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  describe('findById', () => {
    it('should return content when found', async () => {
      const mockContent = { id: 1, title: 'Test Content' };
      (prisma.contentNode.findUnique as jest.Mock).mockResolvedValue(mockContent);
      
      const result = await service.findById(1);
      
      expect(result).toEqual(mockContent);
      expect(prisma.contentNode.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object)
      });
    });
    
    it('should throw NotFoundException when not found', async () => {
      (prisma.contentNode.findUnique as jest.Mock).mockResolvedValue(null);
      
      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### Integration Testing

**E2E Testing with Playwright**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Content Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'teacher@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Wait for navigation
    await page.waitForURL('/dashboard');
  });
  
  test('should create new content', async ({ page }) => {
    // Navigate to content creation
    await page.click('[data-testid="create-content"]');
    
    // Fill form
    await page.fill('[data-testid="title"]', 'Test Content');
    await page.fill('[data-testid="description"]', 'Test Description');
    await page.selectOption('[data-testid="type"]', 'TEXT');
    
    // Submit form
    await page.click('[data-testid="submit"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-title"]')).toContainText('Test Content');
  });
  
  test('should handle validation errors', async ({ page }) => {
    await page.click('[data-testid="create-content"]');
    
    // Submit empty form
    await page.click('[data-testid="submit"]');
    
    // Verify error messages
    await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
    await expect(page.locator('[data-testid="type-error"]')).toContainText('Type is required');
  });
});
```

### 3. **Database Management**

#### Prisma Best Practices

**Schema Design**:
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  firstname String
  lastname  String
  password  String?
  globalRole GlobalRole @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  userSubjects      UserSubject[]
  createdContent    ContentNode[]
  progress          UserContentElementProgress[]
  chatSessions      ChatSession[]
  
  @@map("users")
}

model ContentNode {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  type        ContentType
  order       Int      @default(0)
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Foreign keys
  subjectId   Int
  createdById Int
  
  // Relations
  subject         Subject         @relation(fields: [subjectId], references: [id])
  createdBy       User           @relation(fields: [createdById], references: [id])
  contentElements ContentElement[]
  
  @@map("content_nodes")
}
```

**Migration Strategy**:
```bash
# Create new migration
npx prisma migrate dev --name add_peer_review_system

# Apply migrations in production
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate

# Seed database
npx prisma db seed
```

**Efficient Queries**:
```typescript
// Good: Single query with includes
async getContentWithProgress(contentId: number, userId: number) {
  return this.prisma.contentNode.findUnique({
    where: { id: contentId },
    include: {
      contentElements: {
        include: {
          progress: {
            where: { userId },
            take: 1
          }
        }
      },
      subject: true
    }
  });
}

// Bad: Multiple queries (N+1 problem)
async getContentWithProgressBad(contentId: number, userId: number) {
  const content = await this.prisma.contentNode.findUnique({
    where: { id: contentId },
    include: { contentElements: true }
  });
  
  // This creates N+1 queries
  for (const element of content.contentElements) {
    element.progress = await this.prisma.userContentElementProgress.findFirst({
      where: { contentElementId: element.id, userId }
    });
  }
  
  return content;
}
```

### 4. **Security Guidelines**

#### Input Validation

**DTO Validation**:
```typescript
export class CreateContentDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
  
  @IsEnum(ContentType)
  type: ContentType;
  
  @IsInt()
  @Min(1)
  subjectId: number;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContentElementDTO)
  elements: CreateContentElementDTO[];
}
```

**Sanitization**:
```typescript
import { sanitize } from 'sanitize-html';

@Injectable()
export class ContentService {
  async createContent(createDto: CreateContentDTO): Promise<ContentDTO> {
    // Sanitize HTML content
    const sanitizedContent = {
      ...createDto,
      description: sanitize(createDto.description || '', {
        allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li'],
        allowedAttributes: {}
      })
    };
    
    return this.prisma.contentNode.create({
      data: sanitizedContent
    });
  }
}
```

#### Authentication Security

**Token Management**:
```typescript
@Injectable()
export class AuthService {
  private readonly JWT_SECRET = this.configService.get<string>('JWT_SECRET');
  private readonly JWT_EXPIRES_IN = '2h';
  
  async generateTokens(user: User): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole
    };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.JWT_SECRET,
      expiresIn: this.JWT_EXPIRES_IN
    });
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d'
    });
    
    return { accessToken, refreshToken };
  }
}
```

#### Database Security

**Parameterized Queries**:
```typescript
// Good: Prisma automatically handles parameterization
async searchContent(query: string, subjectId: number) {
  return this.prisma.contentNode.findMany({
    where: {
      AND: [
        { subjectId },
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        }
      ]
    }
  });
}

// Bad: Raw SQL without parameterization (vulnerable to injection)
async searchContentBad(query: string, subjectId: number) {
  return this.prisma.$queryRaw`
    SELECT * FROM content_nodes 
    WHERE subject_id = ${subjectId} 
    AND (title ILIKE '%${query}%' OR description ILIKE '%${query}%')
  `;
}
```

---

## Performance & Scalability

### 1. **Database Optimization**

#### Query Optimization

**Efficient Includes**:
```typescript
// Define reusable include patterns
private getContentNodeInclude() {
  return {
    contentElements: {
      include: {
        progress: {
          where: { userId: this.currentUserId },
          take: 1
        }
      },
      orderBy: { order: 'asc' }
    },
    subject: {
      select: { id: true, name: true }
    },
    createdBy: {
      select: { id: true, firstname: true, lastname: true }
    }
  };
}

// Use in queries
async getContentNodes(subjectId: number): Promise<ContentDTO[]> {
  return this.prisma.contentNode.findMany({
    where: { subjectId },
    include: this.getContentNodeInclude(),
    orderBy: { order: 'asc' }
  });
}
```

**Batch Operations**:
```typescript
// Batch user progress updates
async updateMultipleProgress(
  updates: { userId: number; contentElementId: number; progress: number }[]
): Promise<void> {
  await this.prisma.$transaction(
    updates.map(update => 
      this.prisma.userContentElementProgress.upsert({
        where: {
          userId_contentElementId: {
            userId: update.userId,
            contentElementId: update.contentElementId
          }
        },
        update: { progress: update.progress },
        create: {
          userId: update.userId,
          contentElementId: update.contentElementId,
          progress: update.progress,
          status: 'IN_PROGRESS'
        }
      })
    )
  );
}
```

#### Indexing Strategy

**Database Indexes**:
```sql
-- Performance-critical indexes
CREATE INDEX idx_content_subject_published ON content_nodes(subject_id, is_published);
CREATE INDEX idx_user_progress_user_element ON user_content_element_progress(user_id, content_element_id);
CREATE INDEX idx_discussion_subject_created ON discussions(subject_id, created_at);
CREATE INDEX idx_chat_session_user_updated ON chat_sessions(user_id, updated_at);

-- Vector search optimization
CREATE INDEX idx_transcript_embeddings_vector ON transcript_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Prisma Index Definition**:
```prisma
model UserContentElementProgress {
  id               Int     @id @default(autoincrement())
  userId           Int
  contentElementId Int
  progress         Float   @default(0)
  status           ProgressStatus @default(NOT_STARTED)
  
  user            User           @relation(fields: [userId], references: [id])
  contentElement  ContentElement @relation(fields: [contentElementId], references: [id])
  
  @@unique([userId, contentElementId])
  @@index([userId, status])
  @@index([contentElementId, status])
  @@map("user_content_element_progress")
}
```

### 2. **Caching Strategy**

#### Redis Integration

**Cache Configuration**:
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ttl: 300, // 5 minutes default
      max: 1000 // max items in cache
    })
  ]
})
export class AppModule {}
```

**Service-Level Caching**:
```typescript
@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}
  
  async getPopularContent(subjectId: number): Promise<ContentDTO[]> {
    const cacheKey = `popular-content:${subjectId}`;
    
    // Try to get from cache
    const cached = await this.cacheManager.get<ContentDTO[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const content = await this.prisma.contentNode.findMany({
      where: { 
        subjectId,
        isPublished: true
      },
      include: this.getContentNodeInclude(),
      orderBy: { viewCount: 'desc' },
      take: 10
    });
    
    // Cache for 10 minutes
    await this.cacheManager.set(cacheKey, content, 600);
    
    return content.map(c => this.transformToDTO(c));
  }
  
  async invalidateContentCache(subjectId: number): Promise<void> {
    const pattern = `popular-content:${subjectId}`;
    await this.cacheManager.del(pattern);
  }
}
```

#### Frontend Caching

**Angular Service Caching**:
```typescript
@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private cache = new Map<string, Observable<any>>();
  
  getContent(id: number): Observable<ContentDTO> {
    const cacheKey = `content:${id}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const request = this.http.get<ContentDTO>(`/api/content/${id}`).pipe(
      shareReplay(1),
      tap(() => {
        // Remove from cache after 5 minutes
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      })
    );
    
    this.cache.set(cacheKey, request);
    return request;
  }
  
  invalidateCache(id: number): void {
    this.cache.delete(`content:${id}`);
  }
}
```

### 3. **Memory Management**

#### Connection Pooling

**Prisma Configuration**:
```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  
  async onModuleInit() {
    await this.$connect();
    
    // Configure connection pool
    this.$on('query', (e) => {
      if (e.duration > 1000) {
        console.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
      }
    });
  }
  
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

#### Memory Leak Prevention

**Angular Memory Management**:
```typescript
@Component({
  selector: 'app-content-view',
  template: `...`
})
export class ContentViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    // All subscriptions use takeUntil for cleanup
    this.contentService.getContent(this.contentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(content => {
      this.content = content;
    });
    
    // WebSocket subscription
    this.websocketService.connect().pipe(
      takeUntil(this.destroy$)
    ).subscribe(message => {
      this.handleWebSocketMessage(message);
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 4. **Monitoring & Logging**

#### Application Monitoring

**Performance Metrics**:
```typescript
@Injectable()
export class MetricsService {
  private httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  });
  
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }
  
  async getDatabaseMetrics(): Promise<any> {
    const activeConnections = await this.prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `;
    
    return {
      activeConnections: activeConnections[0].active_connections,
      slowQueries: await this.getSlowQueries()
    };
  }
}
```

**Logging Strategy**:
```typescript
@Injectable()
export class LoggerService {
  private logger = new Logger(LoggerService.name);
  
  logApiRequest(request: Request, response: Response, duration: number): void {
    this.logger.log({
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      duration,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.id
    });
  }
  
  logError(error: Error, context?: any): void {
    this.logger.error({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## Security Considerations

### 1. **Authentication Security**

#### Token Security Best Practices

**Secure Token Storage**:
```typescript
// Consider moving to httpOnly cookies for production
@Injectable()
export class TokenService {
  private readonly TOKEN_KEY = 'hefl_access_token';
  private readonly REFRESH_KEY = 'hefl_refresh_token';
  
  setTokens(accessToken: string, refreshToken: string): void {
    // In production, consider httpOnly cookies
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }
  
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }
}
```

**Token Validation**:
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')
    });
  }
  
  async validate(payload: any) {
    // Validate user still exists and is active
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    
    return {
      userId: payload.sub,
      email: payload.email,
      globalRole: payload.globalRole
    };
  }
}
```

### 2. **Input Validation & Sanitization**

#### Advanced Validation

**Custom Validators**:
```typescript
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isValidSubject', async: true })
export class IsValidSubjectConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}
  
  async validate(subjectId: number): Promise<boolean> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId }
    });
    return !!subject;
  }
  
  defaultMessage(): string {
    return 'Subject ($value) does not exist';
  }
}

// Usage in DTO
export class CreateContentDTO {
  @IsInt()
  @IsValidSubject()
  subjectId: number;
}
```

**HTML Sanitization**:
```typescript
import DOMPurify from 'dompurify';

@Injectable()
export class SanitizationService {
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
      ALLOW_DATA_ATTR: false
    });
  }
  
  sanitizeFileName(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
```

### 3. **Authorization & Access Control**

#### Role-Based Access Control

**Advanced Role System**:
```typescript
@Injectable()
export class AuthorizationService {
  async checkPermission(
    userId: number,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    const user = await this.userService.findById(userId);
    
    // Check global permissions
    if (this.hasGlobalPermission(user.globalRole, resource, action)) {
      return true;
    }
    
    // Check subject-specific permissions
    if (context?.subjectId) {
      const userSubject = await this.prisma.userSubject.findFirst({
        where: { userId, subjectId: context.subjectId }
      });
      
      if (userSubject && this.hasSubjectPermission(userSubject.role, resource, action)) {
        return true;
      }
    }
    
    return false;
  }
  
  private hasGlobalPermission(role: string, resource: string, action: string): boolean {
    const permissions = {
      ADMIN: ['*:*'],
      TEACHER: ['content:*', 'user:read', 'discussion:*'],
      STUDENT: ['content:read', 'discussion:read', 'discussion:create']
    };
    
    return this.matchesPermission(permissions[role] || [], `${resource}:${action}`);
  }
}
```

### 4. **Data Protection**

#### Encryption & Hashing

**Sensitive Data Protection**:
```typescript
@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'default-key',
    'salt',
    32
  );
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 5. **Security Headers & CORS**

#### Security Configuration

**CORS & Security Headers**:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Device-ID']
  });
  
  // Security headers
  app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  await app.listen(3000);
}
```

### 6. **Audit Logging**

#### Security Event Logging

**Audit Trail**:
```typescript
@Injectable()
export class AuditService {
  async logSecurityEvent(
    userId: number,
    action: string,
    resource: string,
    details: any,
    request: Request
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date()
      }
    });
  }
  
  async detectSuspiciousActivity(userId: number): Promise<boolean> {
    const recentLogins = await this.prisma.auditLog.count({
      where: {
        userId,
        action: 'LOGIN',
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });
    
    return recentLogins > 10; // Suspicious if more than 10 logins in an hour
  }
}
```

---

## Conclusion

The HEFL (Hybrid E-Learning Framework) represents a comprehensive, enterprise-grade educational platform that successfully combines traditional web technologies with cutting-edge AI capabilities, real-time collaboration features, and specialized integrations. The platform demonstrates sophisticated architectural patterns while maintaining educational focus and user experience.

### Key Achievements

1. **Full-Stack Type Safety**: Complete type safety from database to UI through shared DTOs
2. **AI-Powered Learning**: Advanced multi-agent tutoring system with contextual feedback
3. **Real-Time Features**: WebSocket-based notifications and collaborative editing
4. **Specialized Integrations**: Seamless CAD application integration and graph visualization
5. **Comprehensive Security**: Multi-strategy authentication with role-based access control
6. **Scalable Architecture**: Modular design supporting feature expansion and performance optimization

### Technical Excellence

The platform showcases modern development practices including:
- **Reactive Programming**: RxJS-based state management and async operations
- **Microservice Patterns**: Modular NestJS architecture with clear separation of concerns
- **Performance Optimization**: Efficient database queries, caching strategies, and connection pooling
- **Security Best Practices**: Input validation, sanitization, and comprehensive audit logging
- **Testing Strategy**: Unit, integration, and E2E testing with high coverage
- **Developer Experience**: Comprehensive tooling, documentation, and development guidelines

### Future Considerations

The architecture is well-positioned for future enhancements:
- **Horizontal Scaling**: Stateless design supports load balancing and clustering
- **Microservices Migration**: Modular structure enables gradual service extraction
- **AI Enhancement**: Extensible AI framework supports new models and capabilities
- **Mobile Development**: API-first design enables mobile app development
- **Cloud Deployment**: Container-ready architecture for modern deployment strategies

This documentation serves as both a technical reference and a testament to the sophisticated engineering practices employed in creating a modern, scalable educational platform.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Create documentation structure plan", "status": "completed", "priority": "high"}, {"id": "2", "content": "Analyze Angular frontend architecture (client_angular)", "status": "completed", "priority": "high"}, {"id": "3", "content": "Analyze NestJS backend architecture (server_nestjs)", "status": "completed", "priority": "high"}, {"id": "4", "content": "Document shared DTOs and contracts", "status": "completed", "priority": "high"}, {"id": "5", "content": "Document authentication and security flow", "status": "completed", "priority": "high"}, {"id": "6", "content": "Document core modules and features", "status": "completed", "priority": "high"}, {"id": "7", "content": "Document AI/ML integrations", "status": "completed", "priority": "high"}, {"id": "8", "content": "Document special integrations (Rhino/Grasshopper, WebSocket)", "status": "completed", "priority": "medium"}, {"id": "9", "content": "Create final comprehensive documentation", "status": "completed", "priority": "high"}]