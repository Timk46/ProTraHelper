# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the HEFL codebase.

## Project Overview

**HEFL** (Hybrid E-Learning Framework) is a university adaptive learning platform featuring:
- **Frontend**: Angular 18+ (standalone components, Material Design, Tailwind CSS)
- **Backend**: NestJS with TypeScript strict mode
- **Database**: PostgreSQL via Prisma ORM (87+ models)
- **Architecture**: Knowledge graph-driven adaptive learning with multi-question engine

**Monorepo Structure:**
```
hefl/
├── client_angular/     # Angular 18+ frontend
├── server_nestjs/      # NestJS backend
├── shared/            # DTOs & contracts (SOURCE OF TRUTH)
└── files/             # Static assets
```

---

## 🚨 ZERO-TOLERANCE RULES

**These rules are ABSOLUTE and BLOCK any code submission that violates them:**

### 1. ❌ NO `any` TYPE USAGE
```typescript
// ✅ (id: string): Promise<ContentDto>  |  ❌ (id: any): Promise<any>
```

### 2. 📦 DTOs MUST BE IN `shared/dtos/`
```typescript
// ✅ import from '@DTOs/...'  |  ❌ interface IContent { } // In frontend/models/
```

### 3. 🏗️ BUSINESS LOGIC ONLY IN SERVICES
```typescript
// ✅ return this.service.getById(id);  |  ❌ prisma.find + mapping in controller
```

### 4. 🗄️ PRISMA SCHEMA CHANGES REQUIRE MIGRATIONS
```bash
# ✅ npx prisma migrate dev --name "desc"  |  ❌ Edit schema.prisma without migration
```

### 5. 🎨 DUMB COMPONENTS: NO SERVICE INJECTION
```typescript
// ✅ @Input/@Output only, no services  |  ❌ constructor(private service: Service) {}
```

### 6. 📝 COMPODOC DOCUMENTATION REQUIRED
```typescript
// ✅ /** @param @returns @throws */  |  ❌ No JSDoc comments on public methods
```

### 7. 🔄 RXJS: UNSUBSCRIBE OR USE ASYNC PIPE
```typescript
// ✅ items$ | async (preferred)  |  ✅ .pipe(takeUntil(destroy$)) + ngOnDestroy
// ❌ .subscribe() without cleanup (memory leak)
```

### 8. 🔐 SECURITY GUARDS REQUIRED
```typescript
// ✅ @UseGuards(JwtAuthGuard, RolesGuard) + @roles('...')  |  ❌ Endpoints without guards
```

### 9. 🎯 NULLABLE TYPE CONSISTENCY
```typescript
// ✅ Optional property (preferred)
interface ContentDto { description?: string; tags?: string[]; }

// ❌ Explicit undefined union (avoid)
interface ContentDto { description: string | undefined; tags: string[] | undefined; }
```
**Exception:** Only use `| undefined` when distinguishing "absent" from "explicitly undefined" matters

---

## 🎯 DTO-FIRST DEVELOPMENT

**Before writing ANY API code, execute this checklist:**

### Pre-Implementation Checklist
1. ✅ **Check if DTO exists** in `shared/dtos/[feature]/`
2. ✅ **Reuse existing DTOs** - Never duplicate
3. ✅ **Create new DTO** in correct location if needed
4. ✅ **Use path aliases** - `@DTOs/...` not `../../../shared/dtos/`
5. ✅ **Use plain interfaces** - DTOs in this project are TypeScript interfaces, NOT classes

### DTO Location Rules
```
✅ CORRECT Structure:
shared/dtos/
  ├── content/
  │   ├── content.dto.ts
  │   ├── create-content.dto.ts
  │   └── update-content.dto.ts
  ├── user/
  │   └── user.dto.ts
  └── index.ts  // Re-export all DTOs

❌ WRONG Locations:
server_nestjs/src/content/dto/       # NO! Not in backend
client_angular/src/app/models/       # NO! Not in frontend
```

### DTO Template (Plain Interface Pattern)
```typescript
// Plain interfaces (NO classes/decorators). JSDoc for documentation.
export interface ContentDTO {
  id: string;
  title: string;
  createdAt: Date;
}
```
**Rules:** `interface` NOT `class` | NO decorators | Export from `shared/dtos/index.ts` | Use `DTO` suffix

### Using DTOs
```typescript
// ✅ import from '@DTOs/content'  |  ❌ '../../../shared/dtos/...'
```

---

## 🏗️ ARCHITECTURE PATTERNS

### NestJS: Thin Controller Pattern
**Controllers ONLY:** Route definition, parameter extraction, HTTP codes, delegation to services

```typescript
@Controller('contents')
@UseGuards(JwtAuthGuard, SubjectAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getContents(@Req() req: Request): Promise<ContentDto[]> {
    return this.contentService.getByUser(req.user.id); // ✅ Delegate to service
  }

  @Post()
  @roles('TEACHER')
  async createContent(@Body() dto: CreateContentDTO, @Req() req: Request) {
    return this.contentService.create(dto, req.user.id); // ✅ Delegate to service
  }
}
```

### NestJS: Fat Service Pattern
**Services contain:** Business logic, validation, data transformation, error handling, DB operations, external calls

```typescript
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService) {}

  /** Retrieves contents with validation & mapping */
  async getByUser(userId: string): Promise<ContentDto[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const contents = await this.prisma.content.findMany({
      where: { authorId: userId, isPublished: true },
      include: { tags: true }
    });
    return contents.map(c => this.mapToDto(c));
  }

  private mapToDto(content: Content & { tags: Tag[] }): ContentDto { /* ... */ }
}
```

### Angular: Smart Component Pattern (Pages/)
**Smart Components:** Located in `Pages/`, inject services, handle routing, manage state, delegate to dumb components

```typescript
// File: client_angular/src/app/Pages/content-management/content-management.page.ts
@Component({
  selector: 'app-content-management-page',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentManagementPageComponent {
  contents$: Observable<ContentDto[]>;

  constructor(private contentService: ContentService, private router: Router) {}

  ngOnInit() {
    this.contents$ = this.contentService.getContents();
  }

  onContentClick(id: string) { this.router.navigate(['/content', id]); }
}
```

### Angular: Dumb Component Pattern
**Dumb Components:** NOT in `Pages/`, NO services, data via `@Input()`, events via `@Output()`

```typescript
@Component({
  selector: 'app-content-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentCardComponent {
  @Input({ required: true }) content!: ContentDto;
  @Output() contentClick = new EventEmitter<string>();
  // NO services injected ✅
}
```

### Dependency Flow
```
✅ Frontend: Smart Component → Service → HttpClient → Backend
✅ Backend: Controller → Service → Prisma/Repository

❌ NEVER: Dumb Component → Service | Controller → Prisma directly | Component → HttpClient directly
```

---

## 📦 MODULE & SERVICE ORGANIZATION

**Modules:** Import shared modules, declare controllers/providers, export services used by other modules
**Service Scope:** `providedIn: 'root'` (app-wide) | `@Injectable()` in module providers (feature-scoped)

---

## 🔐 SECURITY REQUIREMENTS

### Guard Chain Pattern

**Standard endpoint protection:**
```typescript
@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  @Get()
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async getContents(@Req() req): Promise<ContentDTO[]> {
    // req.user is available here
  }
}
```

**Guard execution order:**
```
1. JwtAuthGuard  → Validates JWT token and attaches user to request
2. RolesGuard    → Checks user roles based on @roles() decorator
3. @roles()      → Specifies allowed roles ('STUDENT'|'TEACHER'|'ADMIN'|'ANY')
```

**Important Notes:**
- Use lowercase `@roles()` decorator (NOT `@Roles()` with capital R)
- `JwtAuthGuard` is from `@nestjs/passport`
- `RolesGuard` is a custom guard in HEFL that reads `@roles()` metadata
- After guards pass, `req.user` contains authenticated user data

### HEFL-Specific Security
**Code Execution:** Judge0 sandboxed, timeout/resource limits | **AI:** No PII to external services, anonymized data | **CAD:** Secure BAT generation, path traversal prevention | **Student Data:** GDPR/FERPA, no PII in logs | **Auth:** CAS SSO + JWT

---

## 📚 DOCUMENTATION STANDARDS

### Compodoc (REQUIRED)
All public methods: JSDoc with `@param`, `@returns`, `@throws`, `@example`

### Update Policy
After changes, update: `progress-logic.md` | `auth-flow.md` | `graph-navigation.md` | `api-endpoints.md`

---

## 🔒 TYPE SAFETY STANDARDS

### Nullable Type Patterns

**HEFL Standard: Prefer optional properties (`?:`) over explicit undefined unions**

✅ **CORRECT - Optional property pattern:**
```typescript
interface UserDTO {
  id: string;
  email?: string;        // Property may be absent
  profile?: ProfileDTO;
}

function getUserById(id: string, includeProfile?: boolean): UserDTO { }
```

❌ **AVOID - Explicit undefined union:**
```typescript
interface UserDTO {
  id: string;
  email: string | undefined;        // Unnecessarily verbose
  profile: ProfileDTO | undefined;
}

function getUserById(id: string, includeProfile: boolean | undefined): UserDTO { }
```

**Rationale:**
- `?:` is more concise and idiomatic TypeScript
- Works seamlessly with object destructuring and default values
- Clearer intent: property may not exist vs property exists with undefined value
- Better JSON serialization behavior

**When `| undefined` is acceptable (rare exceptions):**
- Distinguishing "property absent" from "property explicitly set to undefined"
- API responses where undefined has distinct semantic meaning
- External library requirements for explicit undefined

### Definite Assignment

Use definite assignment assertion (`!`) sparingly and only when initialization is guaranteed:

✅ **CORRECT:**
```typescript
@Input({ required: true }) content!: ContentDto;  // Angular guarantees initialization
```

❌ **AVOID:**
```typescript
private data!: string;  // No initialization guarantee
```

---

## ⚡ PERFORMANCE & BEST PRACTICES

### Angular Performance Patterns
- **OnPush:** Use `changeDetection: ChangeDetectionStrategy.OnPush` on all components
- **TrackBy:** Add `trackBy: trackByItemId` in `*ngFor` loops (return `item.id`)
- **State Management:** Use RxJS Observables + BehaviorSubject for component state | Prefer async pipe for automatic subscription management

### RxJS Subscription Cleanup
**See Zero-Tolerance Rule #7** for unsubscribe patterns (takeUntil/async pipe) - memory leaks blocked

### Standalone Components (Angular 18+)
**All new code:** `standalone: true`, import deps directly in `imports` array, use `styleUrl` (singular), combine with `OnPush`
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule],
  styleUrl: './component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
```
⚠️ Old components use NgModule (gradual migration)

### Minimalist Function Principle
❌ No speculative functions. ✅ Only write what's used now.
✅ Extend existing methods with optional params vs creating duplicates.

---

## 📍 ESSENTIAL FILE PATHS

### Most Critical Files

| Type | File | Purpose |
|------|------|---------|
| Progress Logic | `server_nestjs/src/graph/user-concept/user-concept.service.ts` | ⚠️ Level advancement logic |
| Subject Guard | `client_angular/src/app/Guards/registered-for-subject.guard.ts` | ⚠️ Hardcoded subject (line 16) |
| Graph Updates | `client_angular/src/app/Services/graph/graphCommunication.service.ts` | ⚠️ 500ms debounce |
| Progress Service | `client_angular/src/app/Services/progress/progress.service.ts` | ⚠️ Must call after submissions |
| Database Schema | `server_nestjs/prisma/schema.prisma` | 87+ models with relationships |

### Core Controllers & Services

| Component | Backend | Frontend |
|-----------|---------|----------|
| Authentication | `server_nestjs/src/auth/auth.controller.ts` | `client_angular/src/app/Services/auth/user.service.ts` |
| Content | `server_nestjs/src/content/content.controller.ts` | `client_angular/src/app/Services/content/content.service.ts` |
| Questions | `server_nestjs/src/question-data/question-data.controller.ts` | `client_angular/src/app/Services/question/question-data.service.ts` |
| Graph | `server_nestjs/src/graph/graph.controller.ts` | `client_angular/src/app/Services/graph/graph-data.service.ts` |
| Users | `server_nestjs/src/users/users.controller.ts` | `client_angular/src/app/Services/auth/user.service.ts` |
| Analytics | `server_nestjs/src/course_cockpit/analytics/course-cockpit-analytics.controller.ts` | `client_angular/src/app/Pages/course-cockpit/services/course-cockpit-analytics.service.ts` |

---

## 🎓 PROGRESS SYSTEM & DOMAIN LOGIC

### Critical Warnings

- **Hardcoded Subject**: `client_angular/src/app/Guards/registered-for-subject.guard.ts:16` - hardcoded to "Objektorientierte und funktionale Programmierung"
- **Progress Flag**: ALL question submissions MUST set `UserContentElementProgress.markedAsDone = true` or level advancement fails
- **Graph Updates**: 500ms debounce in `client_angular/src/app/Services/progress/progress.service.ts` - call `progressService.answerSubmitted()` after submissions
- **Cascade Deletes**: Many Prisma models use `onDelete: Cascade` - check schema before deleting
- **Level Logic**: `server_nestjs/src/graph/user-concept/user-concept.service.ts:checkUserConceptLevelAward()` is critical for progress

### Progress System Flow

```
1. Question submitted → UserAnswer.isCorrect = true
2. Set UserContentElementProgress.markedAsDone = true  ⚠️ REQUIRED
3. Call UserConceptService.checkUserConceptLevelAward()
4. Check Training.awards for linked ContentNode → ConceptNode
5. Update UserConcept.level = max(Training.awards)
6. Call progressService.answerSubmitted() in frontend  ⚠️ REQUIRED
7. GraphCommunicationService triggers refresh (500ms debounce)
```

### Question Types & Locations

| Type | Backend Module | Frontend Component |
|------|----------------|-------------------|
| Multiple Choice | `server_nestjs/src/question-data/question-data-choice/` | `client_angular/src/app/Pages/contentView/contentElement/mcTask/` |
| Coding | `server_nestjs/src/question-data/question-data-code/` | `client_angular/src/app/Pages/contentView/contentElement/codeTask/` |
| Graph Tasks | `server_nestjs/src/question-data/question-data-graph/` | `client_angular/src/app/Pages/contentView/contentElement/graph-task/` |
| UML | `server_nestjs/src/question-data/question-data-uml/` | `client_angular/src/app/Modules/umlearn/` |
| Fill-in | `server_nestjs/src/question-data/question-data-fillin/` | `client_angular/src/app/Pages/contentView/contentElement/fill-in-task/` |

### Adding New Question Type

When implementing a new question type:
1. Add model to `server_nestjs/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name "add_question_type_xyz"`
3. Create backend module in `server_nestjs/src/question-data/question-data-{type}/`
4. Add DTO to `shared/dtos/question/`
5. Create frontend component in `client_angular/src/app/Pages/contentView/contentElement/{type}Task/`
6. ⚠️ **CRITICAL**: Ensure submission sets `markedAsDone = true` and calls `progressService.answerSubmitted()`

---

## 🛠️ COMMON COMMANDS & CONVENTIONS

| Task | Command |
|------|---------|
| Backend dev | `cd server_nestjs && npm start` (localhost:3000) |
| Frontend dev | `cd client_angular && npm start` (localhost:4200) |
| Seed DB | `cd server_nestjs && npm run seed` |
| DB Studio | `npx prisma studio` |
| Migration | `npx prisma migrate dev --name "desc"` |
| Prisma Generate | `npx prisma generate` |
| Build | `npm run build` (in respective dir) |

### Key Conventions
- **Schema:** Prisma migrations only (`npx prisma migrate dev`)
- **SQL:** Use TypedSQL if needed (docs/overview/Prisma_TypedSQL.md)
- **Question Endpoints:** Update progress flags + call level-award logic
- **File Access:** `File.uniqueIdentifier` not DB IDs
- **Logging:** Angular (disabled in prod) | NestJS (Logger preferred, console.log OK for dev)
- **UI/UX:** Material + Tailwind + Nord Theme + Responsive + WCAG 2.1

---

## 📚 KEY REFERENCES

**Core:** progress-logic.md | auth-flow.md | graph-navigation.md | goalscourse-export-import.md | LearningAnalytics.md
**Details:** project-files-overview.md | api-endpoints.md | prisma-models.md | Prisma_TypedSQL.md | multiple-course-navigation.md

---

## 🎯 SUMMARY CHECKLIST

Before submitting ANY code, verify:

- [ ] No `any` types used anywhere
- [ ] DTOs are from `shared/dtos/` with `@DTOs/` imports
- [ ] DTOs are plain `interfaces`, NOT classes with decorators
- [ ] Business logic is ONLY in services
- [ ] Controllers are thin (HTTP concerns only)
- [ ] Prisma migrations created for schema changes
- [ ] Dumb components have NO service injection
- [ ] Compodoc documentation on all public methods
- [ ] RxJS subscriptions properly unsubscribed (or async pipe used)
- [ ] Security guards applied to endpoints (JwtAuthGuard + RolesGuard)
- [ ] Only necessary functions written (no speculative code)
- [ ] TypeScript strict mode compliance
- [ ] Prefer Logger for production code (console.log acceptable for debugging)

**When in doubt, refer to the specialized agents:**
- `angular-frontend-specialist` - Angular patterns & best practices used in this project
- `nestjs-backend-engineer` - NestJS architecture & APIs
- `hefl-best-practice-checker` - Pre-implementation validation
- `hefl-code-reviewer` - Post-implementation quality gate
