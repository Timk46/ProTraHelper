# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

- **Code & Documentation**: All code, comments, commit messages, and technical documentation must be written in **English**
- **Terminal Communication**: Claude Code should communicate with users in **German** during terminal interactions
- **JSDoc Comments**: All code documentation must be in English for consistency and international collaboration

## Project Overview

HEFL (Hybrid E-Learning Framework) is a sophisticated full-stack e-learning platform with:

- **Frontend**: Angular 18 with Material Design and Tailwind CSS
- **Backend**: NestJS with PostgreSQL (Prisma ORM)
- **Architecture**: Monorepo with shared TypeScript DTOs
- **Special Features**: Rhino/Grasshopper CAD integration, AI-powered tutoring, interactive code exercises

## Essential Commands

### Frontend Development (client_angular/)

```bash
npm install              # Install dependencies
npm start               # Start dev server (http://localhost:4200)
npm run start-local     # Start on local network (192.168.137.1:4200)
npm test                # Run unit tests
npm run compodoc        # Generate documentation (port 8001)
```

### Backend Development (server_nestjs/)

```bash
npm install             # Install dependencies
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Test with coverage
npm run format          # Format code
npm run compodoc        # Generate documentation (port 8002)
```

## Architecture & Key Concepts

### Module Structure

- **Frontend**: `client_angular/src/app/` - Pages (views), Components (UI), Services (API/logic), Guards, Pipes
- **Backend**: `server_nestjs/src/` - Feature modules (auth, chat, content), Controllers (HTTP), Services (logic), DTOs (`shared/dtos/`)

### Authentication Flow

- JWT-based with access (2h) and refresh (30d) tokens
- CAS integration for university SSO
- Guards protect routes on both frontend and backend
- User roles: Student, Lecturer, Administrator

### Real-time Features

- Socket.io for notifications and WebSocket connections
- Real-time updates for forum posts, chat messages

### AI Integration

- LangChain with OpenAI/Cohere for chatbots
- RAG (Retrieval Augmented Generation) for context-aware responses
- AI feedback generation and vector database (pgvector) for semantic search

### Content Types

- **MCQ**: Multiple choice questions
- **Code**: Interactive code editor with language server support
- **Graph**: Algorithm visualization (Dijkstra, Floyd, Kruskal)
- **UML**: Diagram creation and evaluation
- **Freetext**: Open-ended responses
- **Rhino**: CAD/Grasshopper integration

### BAT Rhino Integration

- Backend generates personalized .bat scripts for Rhino/Grasshopper
- Scripts handle Rhino path detection and file opening
- URL protocol registration for browser integration
- Located in `server_nestjs/src/bat-rhino/`

## Development Workflow

### Daily Development

- Split terminal: `cd client_angular && npm start` | `cd server_nestjs && npm run start:dev`
- Database is external (postgres.goals.eti.uni-siegen.de)

### Before Committing

- Ensure no TypeScript errors

### Effective Communication with Claude Code

For complex tasks, use structured prompts to ensure clarity and efficiency:

**Quick Template:**

```
**Aufgabe:** [Clear task description]
**Kontext:** [Relevant files/modules - use @ prefixes like @client_angular/src/app/Pages/]
**Anforderungen:**
- [Specific requirement 1]
- [Specific requirement 2]

**Schritte:**
1. [Implementation step 1]
2. [Implementation step 2]

**Erwartung:** [Expected outcome/deliverable]
```

**Advanced XML Structure (for complex features):**

```xml
<task>
  <objective>Clear goal description</objective>
  <context>Relevant directories and files</context>
  <requirements>
    <item>Specific requirement 1</item>
    <item>Specific requirement 2</item>
  </requirements>
  <implementation-phases>
    <phase>UI/Frontend changes</phase>
    <phase>Backend/API changes</phase>
    <phase>Testing and validation</phase>
  </implementation-phases>
</task>
```

**Key Principles:**

- **Reference specific files**: Use precise paths like `@client_angular/src/app/Services/`
- **Categorize information**: Separate context, requirements, and implementation steps
- **Be explicit about expectations**: Define what success looks like
- **Mention agent usage**: Specify when specialized agents should be used

### Code Standards

- Follow existing patterns in neighboring files
- Use Prisma for all database operations
- DTOs must be defined in `shared/dtos/`
- Use dependency injection in NestJS
- Follow Angular style guide
- **All code, variable names, function names, and comments must be written in English**

### Documentation Requirements

- **All code must be documented with Compodoc-style JSDoc comments in English**
- Classes, methods, complex functions need comprehensive documentation
- Use JSDoc tags: `@description`, `@param`, `@returns`, `@memberof`, `@example`
- Generate docs: `npm run compodoc`

## Core Patterns & Best Practices

### API Design

- RESTful with standard HTTP methods
- URL structure: `/api/module/resource`
- DTOs for request/response validation
- Proper HTTP status codes

### Database Operations

- Always use Prisma client, never raw SQL
- Include error handling
- Use transactions for multi-step operations
- Implement soft deletes where appropriate

### Frontend Services

- Centralize API calls in services
- Use RxJS observables for async operations
- Proper error handling and user feedback
- Cache data with BehaviorSubjects

### Security

- Never commit .env files or secrets
- Validate all user inputs
- Use guards for route protection
- Proper CORS configuration
- Sanitize file uploads

## Testing Strategy

### Unit Tests

- Test services and complex logic
- Mock external dependencies
- Focus on edge cases
- Maintain 70%+ coverage

### E2E Tests

- Test critical user flows
- Use page object pattern
- Test desktop and mobile views
- Screenshots on failure

## Environment Variables

Essential variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Token secrets
- `OPENAI_API_KEY`, `COHERE_API_KEY`: AI features
- `LANGCHAIN_API_KEY`: Tracing
- `JUDGE0_URL`: Code execution service

## Angular Frontend Best Practices

### Architecture: Separation of Concerns

- **Smart Components** (`src/app/Pages`): Views that inject services, manage state, handle data
- **Dumb Components** (`src/app/components`): Reusable UI via `@Input()/@Output()`, no services
- **Services** (`src/app/Services`): All HTTP calls, state management, business logic

### Type Safety: shared/dtos Contract

**Most important rule**: Use `shared/dtos` as single source of truth for all client-server data structures. Strict typing required, `any` forbidden.

```typescript
import { UserDTO } from '@DTOs/index';
getCurrentUser(): Observable<UserDTO> {
  return this.http.get<UserDTO>('/api/users/me');
}
```

### RxJS Standards

- Use `async` pipe in templates (prevents memory leaks)
- Observable variables: `user$`, `contentList$`
- Manual subscriptions: unsubscribe in `ngOnDestroy`

### State Management

- Service-based state with `BehaviorSubject`s for global/shared state

### Additional Patterns

- **Lazy Loading**: Feature modules for performance
- **Route Guards**: Authentication and role checking
- **Reactive Forms**: For complex forms
- **SCSS**: Component-scoped styles

### Naming Conventions

- Files: `feature.type.ts`
- Classes: `UpperCamelCase` with suffix
- Interfaces: `UpperCamelCase`, DTOs with `DTO` suffix
- Observables: `camelCase$`

## NestJS Backend Best Practices

### Modular Architecture

Each feature = independent module with:

- `*.module.ts`: Defines module, imports/exports
- `*.controller.ts`: HTTP layer only (thin controllers)
- `*.service.ts`: All business logic (platform-independent)

### Controller Layer

- Handle HTTP requests/responses only
- Use decorators: `@Controller()`, `@Get()`, `@Post()`, `@Body()`
- Validate with DTOs from `shared/dtos/`
- Delegate all logic to services

### Service Layer

- Implement all business logic
- Database interaction via `PrismaService`
- Platform-independent (no HTTP knowledge)

### Data Layer (Prisma)

- Schema exclusively in `prisma/schema.prisma`
- All changes via migrations: `npx prisma migrate dev`
- Use generated TypeScript types
- `PrismaService` for dependency injection

### Authentication & Authorization

- JWT with Passport.js (`JwtStrategy`)
- Guards: `@UseGuards(JwtAuthGuard)`
- Role-based access control (RBAC)

### Error Handling

- Use NestJS exceptions: `NotFoundException`, `BadRequestException`
- Custom exception filters for specific needs

### Configuration

- Environment variables in `.env`
- `@nestjs/config` module for type-safe access

## TypeScript Best Practices

### Core Philosophy

**Avoid `any` at all costs** - use `unknown`, generics, or proper types

### Type Definitions

- `interface`: Object shapes, extensible
- `type`: Complex types, unions, intersections
- `class`: Instances with logic, required for NestJS DTOs

### Strict Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Code Organization

- Path aliases: `@dtos`, `@components`
- Barrel files: `index.ts` for exports
- Consistent naming: `UpperCamelCase` classes, `camelCase` functions

### Documentation Example

```typescript
/**
 * Retrieves user data with role-based permissions
 * @param {number} userId - User identifier
 * @param {UserRole} role - Requesting user role
 * @returns {Promise<UserDTO>} User data
 */
async getUserWithPermissions(userId: number, role: UserRole): Promise<UserDTO> {
  if (!this.hasPermission(role, 'READ_USER')) {
    throw new ForbiddenException('Insufficient permissions');
  }
  return this.userRepository.findById(userId);
}
```

## Agentic Workflow Protocol

### Phase 1: Exploration

- **Read-only mode**: Understand problem space, code, dependencies
- **Sub-agent delegation**: Complex investigations to specialized agents
- **Information ingestion**: Source files, directories, visual content, web docs

### Phase 2: Strategic Planning

- **Deep analysis**: `think`, `think hard`, `think harder`, `ultrathink` for complexity levels
- **Step by Step Todo List**: always make a stept by stept todo list when implementing or planning and adhere to it strictly.
- **Documented plan**: Formal blueprint with objectives, steps, files, risks
- **Follow-up Questions**: Always ask follow-up questions after the planning phase for potentially unanswered aspects
- **Checkpoint**: Human review before implementation

### Phase 3: Implementation

- **Step-by-step execution**: Follow documented plan of planning agent strictly if its used.
- **Continuous verification**: Plan adherence, codebase consistency, robustness, clarity
