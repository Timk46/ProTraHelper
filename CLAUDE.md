# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run build           # Production build
npm test                # Run unit tests
npm run compodoc        # Generate documentation (port 8001)
```

### Backend Development (server_nestjs/)

```bash
npm install             # Install dependencies
npm start               # Start server
npm run start:dev       # Start with watch mode (recommended)
npm run start:debug     # Start in debug mode
npm run build           # Build for production
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Test with coverage
npm run lint            # Run linter
npm run format          # Format code
npm run compodoc        # Generate documentation (port 8002)
```

### Database Management

```bash
npm run seed            # Reset database and seed with test data
npm run seedProTra      # Seed ProTra-specific dat
npx prisma migrate deploy  # Run pending migrations
npx prisma studio       # Open Prisma Studio GUI
```

### E2E Testing

```bash
npx playwright test                    # Run all E2E tests
npx playwright test --ui               # Interactive UI mode
npx playwright test --project=chromium # Chrome only
npx playwright test --debug            # Debug mode
npx playwright codegen                 # Generate test code
```

### Docker Operations

```bash
docker-compose up -d                   # Start production containers
docker-compose -f Docker/docker-compose.yml up -d  # Start dev database
```

## Architecture & Key Concepts

### Module Structure

- **Frontend Modules**: Located in `client_angular/src/app/`

  - Pages: Main views (content-list, module-overview, etc.)
  - Components: Reusable UI components
  - Services: API communication and business logic
  - Guards: Route protection
  - Pipes: Data transformation

- **Backend Modules**: Located in `server_nestjs/src/`
  - Each feature is a module (auth, chat, content, etc.)
  - Controllers handle HTTP requests
  - Services contain business logic
  - Entities define database models (Prisma)
  - DTOs in `shared/dtos/` for type safety

### Authentication Flow

- JWT-based with access (2h) and refresh (30d) tokens
- CAS integration for university SSO
- Guards protect routes on both frontend and backend
- User roles: Student, Lecturer, Administrator

### Real-time Features

- Socket.io for notifications
- WebSocket connections managed in notification module
- Real-time updates for forum posts, chat messages

### AI Integration

- LangChain with OpenAI/Cohere for chatbots
- RAG (Retrieval Augmented Generation) for context-aware responses
- AI feedback generation for student submissions
- Vector database (pgvector) for semantic search

### Content Types

The system supports various interactive content types:

- **MCQ**: Multiple choice questions
- **Code**: Interactive code editor with language server support
- **Graph**: Algorithm visualization (Dijkstra, Floyd, Kruskal)
- **UML**: Diagram creation and evaluation
- **Freetext**: Open-ended responses
- **Rhino**: CAD/Grasshopper integration

### Recent BAT Rhino Integration

A new system for launching Rhino with Grasshopper files:

- Backend generates personalized .bat scripts
- Scripts handle Rhino path detection and file opening
- URL protocol registration for browser integration
- Located in `server_nestjs/src/bat-rhino/`

## Development Workflow

1. **Initial Setup**:

   - Clone repository
   - Install dependencies in both client_angular and server_nestjs
   - Configure .env file in server_nestjs (copy from .env.example if available)
   - Run database migrations

2. **Daily Development**:

   - Split terminal in VS Code
   - Terminal 1: `cd client_angular && npm start`
   - Terminal 2: `cd server_nestjs && npm run start:dev`
   - Database is external (postgres.goals.eti.uni-siegen.de)

3. **Before Committing**:

   - Run linter: `npm run lint` (backend only)
   - Run tests: `npm test` in both directories
   - Ensure no TypeScript errors

4. **Code Style**:
   - Follow existing patterns in neighboring files
   - Use Prisma for all database operations
   - DTOs must be defined in shared/dtos/
   - Use dependency injection in NestJS
   - Follow Angular style guide

## Important Patterns

### API Endpoints

- RESTful design with standard HTTP methods
- Consistent URL structure: `/api/module/resource`
- Use DTOs for request/response validation
- Error handling with proper HTTP status codes

### Database Operations

- Always use Prisma client, never raw SQL
- Include error handling for database operations
- Use transactions for multi-step operations
- Implement soft deletes where appropriate

### Frontend Services

- Centralize API calls in services
- Use RxJS observables for async operations
- Implement proper error handling and user feedback
- Cache data where appropriate using BehaviorSubjects

### Security

- Never commit .env files or secrets
- Validate all user inputs
- Use guards for route protection
- Implement proper CORS configuration
- Sanitize file uploads

## Testing Strategy

### Unit Tests

- Test services and complex logic
- Mock external dependencies
- Focus on edge cases
- Maintain test coverage above 70%

### E2E Tests

- Test critical user flows
- Use page object pattern
- Test both desktop and mobile views
- Screenshots on failure for debugging

## Common Tasks

### Adding a New Feature Module

1. Generate module: `nest g module feature-name`
2. Create controller: `nest g controller feature-name`
3. Create service: `nest g service feature-name`
4. Define DTOs in shared/dtos/
5. Add Prisma schema if needed
6. Implement business logic
7. Add tests

### Working with Prisma

1. Modify schema in `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate deploy --name description`
3. Update client: `npx prisma generate`
4. Seed data if needed in `prisma/seed/`

### Debugging

- Frontend: Chrome DevTools with source maps
- Backend: Use `npm run start:debug` with VS Code debugger
- Database: `npx prisma studio` for visual inspection
- Logs: Check console output and log files

## Environment Variables

Essential environment variables needed:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`: Access token secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `OPENAI_API_KEY`: For AI features
- `COHERE_API_KEY`: For AI features
- `LANGCHAIN_API_KEY`: For tracing
- `JUDGE0_URL`: Code execution service


### **Best Practices and Conventions for the Angular Frontend (`client_angular`)**

This document describes the architecture, conventions, and best practices for the development of the `client_angular` project. Adherence to these guidelines is crucial to ensure the code quality, maintainability, and scalability of the application.

#### **1. Architecture: Separation of Concerns**

The frontend's architecture follows the principle of a clear separation of responsibilities. Components are primarily responsible for presentation, while logic is outsourced to services.

- **`src/app/Pages` (Smart/Container Components):**

  - **Purpose:** Represent complete views or pages (e.g., `content-list.component.ts`).
  - **Responsibilities:**
    - Communicate with services to fetch or send data.
    - Manage the state of the respective view.
    - Bind data to "Dumb Components" and react to their events.
  - **Rule:** Components in `Pages` are the only ones allowed to inject services directly.

- **`src/app/components` (Dumb/Presentational Components) - _Recommendation_**

  - **Purpose:** Reusable UI elements (e.g., a special button, a card, a form field). _It is recommended to create such a folder._
  - **Responsibilities:**
    - Receive data exclusively via `@Input()` properties.
    - Emit user interactions to the parent "Smart Component" via `@Output()` events.
    - Contain no business logic and have no knowledge of services.
  - **Rule:** These components must be as "dumb" as possible. Their sole task is to display data and react to user input.

- **`src/app/Services` (Logic and Data Layer):**
  - **Purpose:** Encapsulate business logic and all communication with the backend.
  - **Responsibilities:**
    - Perform HTTP calls to the NestJS backend using `HttpClient`.
    - Manage and share application state (e.g., the logged-in user).
    - Process and map data coming from the server.
  - **Rule:** Every interaction with the backend must go through a service.

#### **2. Type Safety: The `shared/dtos` Contract**

**This is the most important rule in the entire project.**

- **Single Source of Truth:** The `shared/dtos` directory is the sole source of truth for all data structures exchanged between the Angular client and the NestJS server.
- **Strict Typing:** All HTTP requests (payloads) and responses must be typed using the interfaces from this directory.
- **Prohibition of `any`:** The use of the `any` type is strictly forbidden. If a type is needed that does not exist, the corresponding DTO must first be created or extended in the `shared` directory.

**Example:**

```typescript
// in a service
import { UserDTO } from '@DTOs/index'; // use path alias @dtos
import { Observable } from 'rxjs';

// ...

getCurrentUser(): Observable<UserDTO> {
  return this.http.get<UserDTO>('/api/users/me');
}
```

#### **3. Asynchronicity with RxJS**

- **Standard for Asynchronicity:** RxJS is the standard tool for handling all asynchronous operations, especially HTTP calls.
- **The `async` Pipe:** In HTML templates, the `async` pipe must **always** be used to subscribe to Observables. This delegates the management of subscriptions (including the crucial unsubscribe) to Angular and prevents memory leaks.

  ```html
  <!-- GOOD -->
  <div *ngIf="user$ | async as user">Hello, {{ user.firstname }}</div>

  <!-- BAD: Manual .subscribe() in the component -->
  ```

- **Naming Convention for Observables:** Variables holding an Observable must be named with a `$` suffix (e.g., `user$`, `contentList$`).
- **Manual Subscriptions:** If a manual `.subscribe()` in the component logic is unavoidable, the subscription must be explicitly terminated in `ngOnDestroy` to prevent memory leaks.

#### **4. State Management**

- **Service-based State:** For managing global or shared state across multiple components (e.g., logged-in user, selected course), RxJS `BehaviorSubject`s are used within services.
- A `BehaviorSubject` provides the current value to new subscribers and allows the state to be updated.

**Example in an `AuthService`:**

```typescript
private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();

// ... method to set the user
setCurrentUser(user: UserDTO | null) {
  this.currentUserSubject.next(user);
}
```

#### **5. Routing**

- **Lazy Loading:** Feature areas of the application should be implemented as standalone modules and loaded via lazy loading in `app-routing.module.ts`. This significantly improves the initial load time of the application.
- **Route Guards (`src/app/Guards`):** Access to routes must be protected by guards. These check, for example, if a user is authenticated (`AuthGuard`) or has a specific role (`RoleGuard`).

#### **6. Forms**

- **Reactive Forms:** For all forms (except trivial single-field forms), **Reactive Forms** must be used. They offer a better structure, testability, and explicit control over the form's data model.
- The logic is created in the component class using `FormBuilder`, `FormGroup`, and `FormControl`.

#### **7. Styling (SCSS)**

- **Encapsulated Styles:** Each component has its own `*.component.scss` file. The styles within are automatically scoped to the component, which prevents global conflicts.
- **Global Styles:** Global styles, variables (for colors, font sizes, spacing), and mixins belong in the `src/styles/` directory.

#### **8. Naming Conventions**

The official Angular naming conventions must be followed:

- **File Names:** `feature.type.ts` (e.g., `content-list.component.ts`, `auth.service.ts`, `auth.guard.ts`).
- **Class Names:** `UpperCamelCase` with the corresponding suffix (e.g., `ContentListComponent`, `AuthService`).
- **Interfaces:** `UpperCamelCase`. For DTOs, use the suffix `DTO` (e.g., `UserDTO`).
- **Observables:** `camelCase$` (e.g., `users$`).x

Of course. Here is the detailed translation of the best practices and conventions for the `server_nestjs` backend.

---

Of course. Here is a detailed description of the best practices and conventions for the `server_nestjs` backend. It serves as a technical guide and provides the necessary context for developers and language models.

---

### **Best Practices and Conventions for the NestJS Backend (`server_nestjs`)**

This document defines the architectural patterns, conventions, and best practices for the development of the `server_nestjs` project. The goal is to ensure a robust, scalable, and maintainable backend.

#### **1. Architecture: Modular Design**

The core of the NestJS application is its modular architecture. Each business feature is encapsulated in its own independent module.

- **Feature Modules:** Every main feature of the application (e.g., `auth`, `users`, `content`, `discussion`) resides in its own directory within `src/`.
- **Module Structure:** A typical module consists of three main components:
  - **`*.module.ts`:** Defines the module and declares its associated `Controllers` and `Providers` (Services). It imports other modules it needs and can export its own services if they are to be used by other modules.
  - **`*.controller.ts`:** The interface to the outside world. It receives incoming HTTP requests, validates them, and delegates the processing to the service.
  - **`*.service.ts`:** The brain of the module. It contains all the business logic, which is independent of the type of incoming request.

This design enforces a clear Separation of Concerns and makes the application easier to understand and extend.

#### **2. Controller Layer (`*.controller.ts`)**

Controllers are the traffic and security control of the API.

- **Task:** Exclusively responsible for handling the HTTP layer.
- **Responsibilities:**
  - Defining routes with decorators (`@Controller('users')`, `@Get(':id')`, `@Post()`).
  - Extracting data from the request using decorators (`@Body()`, `@Param()`, `@Query()`, `@Req()`).
  - **Validation of Input Data:** Incoming data in the `@Body` must be typed and validated by a DTO from the `shared` directory. NestJS's `ValidationPipe` (globally enabled) handles this automatically.
  - Delegating the business logic to the corresponding service.
  - Formatting the HTTP response (status codes, return data).
- **Rule: Controllers are "thin".** They contain **no** business logic. Their job is to accept the request, validate it, and forward it to the service.

**Example:**

```typescript
import { CreateUserDTO } from "@DTOs/index";

/**
 * Controller für die Behandlung von benutzerbezogenen HTTP-Anfragen
 *
 * @description Dieser Controller verwaltet alle HTTP-Endpunkte für Benutzeroperationen.
 * Er folgt dem Prinzip dünner Controller, indem er nur die HTTP-Schicht behandelt
 * und die gesamte Geschäftslogik an den UsersService delegiert.
 *
 * @Controller users
 */
@Controller("users")
export class UsersController {
  /**
   * Erstellt eine Instanz des UsersController
   *
   * @description Injiziert den UsersService über Dependency Injection
   *
   * @param {UsersService} usersService - Der injizierte UsersService für Geschäftslogik
   * @memberof UsersController
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Erstellt einen neuen Benutzer
   *
   * @description Dieser Endpunkt empfängt Benutzerdaten über den Request Body,
   * validiert sie automatisch über das ValidationPipe und delegiert die
   * Erstellung an den UsersService. Der Controller enthält keine Geschäftslogik.
   *
   * @method POST
   * @route POST /users
   *
   * @param {CreateUserDTO} createUserDto - Die validierten Benutzerdaten
   * @returns {Promise<User>} Promise mit dem erstellten Benutzer
   */
  @Post()
  async createUser(@Body() createUserDto: CreateUserDTO): Promise<User> {
    // Keine Logik hier, nur Delegation!
    return this.usersService.create(createUserDto);
  }
}
```

#### **3. Service Layer (`*.service.ts`)**

Services are where the actual work happens.

- **Task:** Implementation of all business logic.
- **Responsibilities:**
  - Interaction with the database via the `PrismaService`.
  - Performing calculations and data manipulations.
  - Calling other services to orchestrate complex workflows.
  - Implementing external API calls (if necessary).
- **Rule:** Services are completely platform-independent. They know nothing about HTTP requests or responses. They receive processed data from the controller and return the result.

#### **4. Data Layer with Prisma**

Prisma is the bridge to the database and the "Single Source of Truth" for the data model.

- **Schema Definition:** The entire database schema is defined **exclusively** in the `prisma/schema.prisma` file.
- **Migrations:** Every change to the schema **must** be done through a Prisma migration (`npx prisma migrate dev`). This versions the database structure and ensures consistency across all development environments. Manually changing the database is forbidden.
- **`PrismaService`:** A central, reusable service that encapsulates the `PrismaClient` and is provided via dependency injection in every module that requires database access.
- **Type Safety:** Prisma automatically generates TypeScript types from the schema. These types (e.g., `User`, `Post`) should be used within the services to ensure complete type safety down to the database level.

#### **5. Type Safety: The `shared/dtos` Contract**

**Adherence to this contract is of the highest priority.**

- **API Contract:** The `shared/dtos` directory defines the type-safe contract between the backend and the frontend.
<!-- *   **Validation:** DTOs in the backend are not just interfaces, but **classes** enriched with decorators from `class-validator` (e.g., `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`). -->
- **Global `ValidationPipe`:** A globally registered `ValidationPipe` in `main.ts` ensures that all incoming requests using a DTO in the `@Body` are automatically validated against these rules. Requests with invalid data are rejected with a `400 Bad Request` response and detailed error messages.

#### **6. Authentication & Authorization (`auth` Module)**

- **Passport.js & JWT:** Authentication is based on JSON Web Tokens (JWT) and implemented with Passport.js. The `JwtStrategy` validates incoming tokens.
- **Guards:** Endpoints are protected with guards (`@UseGuards(JwtAuthGuard)`). These ensure that only requests with a valid JWT can pass.
- **Role-Based Access Control (RBAC):** Specific roles (e.g., `ADMIN`, `TEACHER`) can be checked in guards to restrict access to certain operations. The role information is extracted from the JWT payload.

#### **7. Error Handling**

- **Standard Exceptions:** NestJS offers a range of built-in HTTP exception classes (e.g., `NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`). These should be thrown in the services to send appropriate HTTP status codes to the client.
- **Exception Filters:** NestJS automatically catches all unhandled errors and sends a generic `500 Internal Server Error` response. For specific logging or error formats, custom exception filters can be created.

#### **8. Configuration**

- **Environment Variables:** Application configuration (database URL, JWT secret, etc.) is handled exclusively via environment variables in a `.env` file.
- **`ConfigModule`:** The `@nestjs/config` module is used to access these variables in a type-safe manner. Hardcoding configuration values in the code is strictly forbidden.

#### **9. Naming Conventions**

- **File Names:** `feature.type.ts` (e.g., `users.controller.ts`, `auth.service.ts`).
- **Class Names:** `UpperCamelCase` with the corresponding suffix (e.g., `UsersService`, `JwtAuthGuard`).
- **DTO Classes:** `UpperCamelCaseDTO` (e.g., `CreateUserDTO`, `UpdateContentDTO`).

Of course. Here is the complete and detailed translation of the TypeScript best practices guide into English.

---

Absolutely. Here is a comprehensive guide as a Markdown file, describing the best practices for using TypeScript in a modern web stack with Angular and Nest.js.

---

# TypeScript Best Practices for Angular & Nest.js Web Applications

This document serves as a guide for the effective use of TypeScript in the context of Angular frontends and Nest.js backends. The goal is to create robust, maintainable, and type-safe code that optimally leverages the strengths of both frameworks.

## Table of Contents

1. [Core Philosophy: Static Typing as a Foundation](#1-core-philosophy-static-typing-as-a-foundation)
2. [Type Definitions: `interface` vs. `type` vs. `class`](#2-type-definitions-interface-vs-type-vs-class)
3. [The API Contract: `shared/dtos`](#3-the-api-contract-shareddtos)
4. [Asynchronicity: RxJS and Promises](#4-asynchronicity-rxjs-and-promises)
5. [Code Organization and Modularity](#5-code-organization-and-modularity)
6. [Naming Conventions](#6-naming-conventions)
7. [Strict Compiler Options (`tsconfig.json`)](#7-strict-compiler-options-tsconfigjson)
8. [Generics for Reusability](#8-generics-for-reusability)
9. [Decorators: The Magic of Angular & Nest.js](#9-decorators-the-magic-of-angular--nestjs)

---

### 1. Core Philosophy: Static Typing as a Foundation

TypeScript loses its greatest advantage when type safety is undermined. Therefore, the number one rule is:

**Avoid `any` at all costs.**

`any` disables type checking for a variable, effectively turning TypeScript into JavaScript and defeating its purpose. It's an "escape hatch" that is only temporarily acceptable in absolute exceptional cases (e.g., when migrating legacy JavaScript code).

**Alternatives to `any`:**

- **`unknown`:** The type-safe alternative. `unknown` forces you to perform type checking (e.g., with `typeof`, `instanceof`, or type guards) before you can access properties on the variable.
- **Generics:** Allow you to write functions and classes that are flexible yet still type-safe.

```typescript
// BAD
function processData(data: any): string {
  return data.name; // No safety, `name` might not exist.
}

// GOOD
function processData(data: unknown): string {
  if (typeof data === "object" && data && "name" in data) {
    return (data as { name: string }).name; // Type check before access
  }
  throw new Error("Invalid data structure");
}
```

### 2. Type Definitions: `interface` vs. `type` vs. `class`

Choosing the right tool to define data structures is crucial.

| Keyword         | Usage                                                                                | Reasoning                                                                                                                                             |
| :-------------- | :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **`interface`** | Defining object shapes, especially for public-facing APIs.                           | Can be extended with `extends` and combined through "Declaration Merging." This makes them ideal for extensible libraries and clear object contracts. |
| **`type`**      | Defining complex types, union types (`                                               | `), intersection types (`&`), or aliases for primitives.                                                                                              | More flexible for non-object-based types. Cannot be extended after definition. |
| **`class`**     | Defining structures that require instances, methods, logic, and runtime information. | Necessary for Dependency Injection in Angular/Nest.js. **Mandatory for Nest.js DTOs**, as validation decorators can only be applied to classes.       |

**Rule of Thumb:**

- Use `interface` for the shape of objects.
- Use `type` for everything else (unions, tuples, etc.).
- Use `class` when you need an instance with logic (`new MyClass()`) or decorator metadata (Nest.js DTOs).

### 3. The API Contract: `shared/dtos`

Type-safe communication between the client and server is the backbone of the application.

- **Single Source of Truth:** A dedicated `shared` or `common` folder contains all Data Transfer Objects (DTOs) used by both the frontend and the backend.
<!-- - **Nest.js (Backend):** DTOs are **`class`es** annotated with `class-validator` decorators to automatically validate incoming requests. -->
- **Angular (Frontend):** The same DTOs are imported as **`interface` or `class`** to type HTTP responses and request payloads.

```typescript
// in shared/dtos/user.dto.ts
export class UserDTO {
  // For Nest.js validation
  @IsInt()
  id: number;

  @IsString()
  @IsNotEmpty()
  firstname: string;
}

// in angular.service.ts
import { UserDTO } from '@DTOs/index'; // Use path aliases!
...
getUser(id: number): Observable<UserDTO> {
  return this.http.get<UserDTO>(`/api/users/${id}`);
}
```

### 4. Asynchronicity: RxJS and Promises

- **Angular:** Primarily relies on **RxJS Observables**.
  - **Type your streams:** `Observable<UserDTO[]>` is better than `Observable<any[]>`.
  - **`async` Pipe:** Use the `async` pipe in templates to delegate subscription management (including unsubscribing) to Angular.
  - **`$` Suffix:** Observable variables should always end with a dollar sign (`users$`).
- **Nest.js:** Primarily relies on **Promises** with `async/await`.
  - **Explicit Return Types:** A function that returns a Promise must be explicitly typed: `async function findUser(): Promise<UserDTO>`.

### 5. Code Organization and Modularity

- **Path Aliases:** Configure path aliases in your `tsconfig.json` (`"paths": { "@dtos": ["shared/dtos"] }`) to avoid messy relative paths (`../../../`).
- **Barrel Files (`index.ts`):** Use `index.ts` files to bundle exports from a directory. This simplifies import statements.

```typescript
// in shared/dtos/index.ts
export * from "./user.dto";
export * from "./content.dto";

// in another file
import { UserDTO, ContentDTO } from "@dtos";
```

### 6. Naming Conventions

Consistency is the key to readability.

| Artifact                          | Convention                           | Example                                          |
| :-------------------------------- | :----------------------------------- | :----------------------------------------------- |
| Classes, Interfaces, Types, Enums | `UpperCamelCase`                     | `ContentService`, `UserDTO`, `NotificationType`  |
| Variables, Functions              | `camelCase`                          | `currentUser`, `fetchContent()`                  |
| Private Members                   | `camelCase` (with `private` keyword) | `private userCount: number`                      |
| Observables                       | `camelCase$`                         | `users$`, `contentNode$`                         |
| Files                             | `feature.type.ts`                    | `user.service.ts`, `content-list.component.html` |

### 7. Strict Compiler Options (`tsconfig.json`)

The `tsconfig.json` is the foundation of type safety. The following options should always be enabled:

```json
{
  "compilerOptions": {
    "strict": true, // Enables all strict type-checking options
    "noImplicitAny": true, // Raise error on expressions and declarations with an implied 'any' type
    "strictNullChecks": true, // Differentiates between 'string' and 'string | null'
    "forceConsistentCasingInFileNames": true, // Disallow inconsistently-cased references to the same file
    "noUnusedLocals": true, // Report errors on unused local variables
    "noUnusedParameters": true, // Report errors on unused parameters
    "noImplicitReturns": true // Report error when not all code paths in function return a value
  }
}
```

### 8. Generics for Reusability

Generics allow you to write flexible and reusable components without sacrificing type safety.

```typescript
// A generic service wrapper for HTTP calls
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`/api/${endpoint}`);
  }
}

// Usage
apiService.get<UserDTO[]>("users").subscribe((users) => {
  // `users` is correctly typed as `UserDTO[]` here
});
```

### 9. Decorators: The Magic of Angular & Nest.js

Decorators are a central feature of both frameworks.

- **Understanding:** Understand what the framework-provided decorators do (`@Injectable()`, `@Controller()`, `@Component()`, `@Get()`, `@Body()`).
- **Custom Decorators:** Create your own decorators to reduce boilerplate code, e.g., a `@User()` decorator in Nest.js that extracts the current user from the request object.

Of course. Here is a more detailed and structured formulation of those instructions, designed to serve as a comprehensive operational guide for an agentic LLM.

### **Agentic Workflow Protocol: Explore, Plan, Code, Commit**

This protocol outlines a four-phase, structured methodology for tackling complex tasks. Its purpose is to ensure thorough analysis, robust planning, and verifiable implementation, minimizing errors and maximizing the quality of the final output.

---

### **Phase 1: Exploration & Contextual Grounding**

**Objective:** To build a complete and accurate understanding of the problem space, existing code, dependencies, and constraints _before_ formulating a solution. Premature coding is to be strictly avoided.

**Core Directives:**

1.  **Comprehensive Information Ingestion:**

    - You will begin by reading and parsing all relevant materials. Your analysis is not limited to text files. You must be prepared to:
      - **Read specific source code files:** (e.g., `read and analyze logging.py and user_auth.py`).
      - **Scan entire directories:** (e.g., `examine the /src/api/v1 directory to understand the existing API structure`).
      - **Parse data files:** (e.g., `analyze the schema of config.json and sample_data.csv`).
      - **Interpret visual information:** (e.g., `analyze the UI mockup in 'dashboard_v3.png' to understand the required front-end components`).
      - **Process web content:** (e.g., `review the API documentation at the provided URL: https://api.docs/v2/`).
    - During this phase, you are in a **read-only** mode. Your primary goal is to absorb information, not to generate solutions or write code.

2.  **Strategic Use of Sub-Agents for Focused Investigation:**
    - For complex or multifaceted problems, you must delegate specific investigatory tasks to specialized sub-agents. This maintains the integrity of your primary operational context and allows for parallelized, efficient information gathering. Always use them for reading and analyzing files.
    - **Example Delegations:**
      - "Sub-agent, investigate the official documentation for the `matplotlib` library and report back on the best methods for creating time-series plots with logarithmic axes."
      - "Sub-agent, verify the authentication method required by the third-party API endpoint defined in `external_comms.py`."
      - "Sub-agent, cross-reference the database schema with the models defined in `models.py` and flag any inconsistencies."

---

### **Phase 2: Strategic Planning & Solution Architecture**

**Objective:** To develop a detailed, step-by-step blueprint for solving the problem. This plan serves as the foundational document for the implementation phase.

**Core Directives:**

1.  **Triggering Deep Thought:**

    - To ensure you allocate sufficient computational resources to devise a robust plan, you will be prompted with specific keywords. These keywords directly map to an increasing budget for analysis, comparison of alternatives, and strategic evaluation.
      - `think`: For straightforward tasks requiring a simple, linear plan.
      - `think hard`: For complex tasks requiring evaluation of a few different approaches.
      - `think harder`: For highly complex problems where you must weigh the pros and cons of multiple architectural patterns.
      - `ultrathink`: For novel or mission-critical tasks demanding an exhaustive exploration of potential solutions, risk factors, and long-term implications.

2.  **Plan Documentation as a Checkpoint:**
    - The output of this phase must be a formal, documented plan. This can be a markdown file, a list of steps, or a pre-populated GitHub issue.
    - This document is a critical checkpoint. It allows for human review and approval before implementation begins. It also serves as a "safe state" to which you can revert if the subsequent coding phase proves to be flawed or takes a wrong turn. A good plan should include:
      - A clear statement of the objective.
      - A sequential list of implementation steps.
      - Identification of all files to be created or modified.
      - A list of new functions or classes to be added.
      - An analysis of potential risks or edge cases.

---

### **Phase 3: Implementation & In-line Verification**

**Objective:** To translate the approved strategic plan into clean, efficient, and correct code, while continuously validating the output against the plan and the existing environment.

**Core Directives:**

1.  **Execute the Plan Step-by-Step:**

    - You will now proceed to implement the solution, strictly following the steps outlined in the documented plan from Phase 2.

2.  **Continuous Self-Verification:**
    - Implementation is not a monolithic task. As you write each block of code, function, or class, you must immediately perform a self-verification check. Ask yourself:
      - **Plan Adherence:** Does this code directly fulfill the current step of the plan?
      - **Codebase Consistency:** Does this code match the style, patterns, and conventions of the surrounding code discovered in Phase 1?
      - **Robustness:** Have I accounted for potential errors, null inputs, or edge cases? Is the error handling appropriate?
      - **Clarity:** Is the code clear? Are comments or docstrings necessary to explain complex logic?

---
