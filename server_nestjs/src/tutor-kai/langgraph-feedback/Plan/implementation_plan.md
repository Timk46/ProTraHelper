# Plan: Implement Feedback System using LangGraph Supervisor (Revised)

**Objective:** Implement an adaptive, pedagogically-informed feedback system using LangGraph and the `@langchain/langgraph-supervisor` library. The system will select the single most appropriate feedback type based on student context, potentially using tools like RAG to fetch domain knowledge.

**Core Components & Structure:**

*   **Main Service:** `langgraph-feedback.service.ts` (Orchestrates graph setup and execution).
*   **State:** `langgraph-feedback.state.ts` (Defines the shared graph state).
*   **Supervisor:** `supervisor/` directory containing the supervisor prompt (`supervisor.prompt.txt`).
*   **Agents:** `agents/` directory with subdirectories for the selected agents (`km/`, `kh/`, `kc/`, `ktc/`).
    *   Each agent defined in its respective file (e.g., `agents/km/km.agent.ts`) using `createReactAgent`.
    *   Shared agent logic/helpers in `agents/agent.common.ts`.
*   **Tools:** `tools/` directory with subdirectories for each tool.
    *   `tools/domain-knowledge/` contains the RAG tool implementation (`domain-knowledge.service.ts`, `domain-knowledge.tool.ts`).

**1. Project Setup & Dependencies:**

*   Ensure `Node.js` and `npm`/`yarn` are installed.
*   Install/verify required libraries in the `server_nestjs` directory:
    ```bash
    npm install @langchain/langgraph-supervisor @langchain/langgraph @langchain/openai @langchain/core @langchain/community zod @prisma/client
    # Ensure prisma is also installed if not already present globally/locally
    npm install prisma --save-dev
    ```
*   Configure environment variables for `OPENAI_API_KEY` (e.g., in `server_nestjs/.env`).
*   Setup Prisma schema (`schema.prisma`) including the `TranscriptEmbedding` model with a vector field. Run `npx prisma generate`.

**2. Define LangGraph State:**

*   Create `langgraph-feedback.state.ts` with the `FeedbackGraphState` interface and Zod schema.
    ```typescript
    import { BaseMessage } from '@langchain/core/messages';
    import { z } from 'zod';

    export interface FeedbackGraphState { // No longer extends StateGraphArgs directly
      messages: BaseMessage[];
      compilerOutput: string | null;
      unitTestResults: any | null;
      studentSolution: string;
      taskDescription: string;
      attemptCount: number;
      feedbackOutput: string | null;
      // Add other fields if needed by agents/tools/supervisor
    }

    export const zodSchema = z.object({ /* ... Zod definitions ... */ });
    export type State = z.infer<typeof zodSchema>;
    ```

**3. Implement Domain Knowledge Tool:**

*   Create `tools/domain-knowledge/domain-knowledge.service.ts`:
    *   Inject `ConfigService` (and ideally `PrismaService`).
    *   Initialize `PrismaVectorStore` targeting `TranscriptEmbedding` table on module init.
    *   Implement `searchLectureContent(query: string, k: number)` method using `vectorStore.similaritySearch`.
    *   Include logic to parse results (assuming content stores stringified JSON).
*   Create `tools/domain-knowledge/domain-knowledge.tool.ts`:
    *   Define a Zod schema (`DomainKnowledgeToolSchema`) for the input (`query`, optional `k`).
    *   Create a function `createDomainKnowledgeTool(service)` that returns a `DynamicTool`.
    *   Tool name: `search_domain_knowledge`.
    *   Description: Explain its function and that input must be a JSON string matching the schema.
    *   `func`: Accepts input string, parses JSON, validates with Zod schema, calls `service.searchLectureContent`, formats results, and returns a string.

**4. Implement Feedback Agents (Nodes):**

*   Create `agents/agent.common.ts`:
    *   Include shared imports (`ChatOpenAI`, `createReactAgent`, etc.).
    *   Initialize shared `ChatOpenAI` model (consider proper DI).
    *   Define `createFeedbackAgent(name: string, systemPrompt: string, tools: any[] = [])` helper function.
*   For *each* selected feedback type (KM, KH, KC, KTC), create its file (e.g., `agents/km/km.agent.ts`):
    *   Import `createFeedbackAgent` from `agent.common.ts`.
    *   Define the agent-specific system prompt.
    *   Export the agent instance created by calling `createFeedbackAgent` (passing the specific prompt and tools if needed).
    *   **Update KC Agent (`agents/kc/kc.agent.ts`):** Modify its system prompt to instruct it to use the `search_domain_knowledge` tool, expecting a JSON string input for the tool.

**5. Implement the Supervisor Node:**

*   Create `supervisor/supervisor.prompt.txt`:
    *   Define the supervisor's role, principles, context, available agents, and decision logic based on `router_plan.md`.
    *   Instruct the LLM to output the *name* of the single chosen agent (e.g., "KM", "KH") or `__END__`.
    *   Include placeholders for context variables.

**6. Define and Compile the Graph in `LanggraphFeedbackService`:**

*   Create `langgraph-feedback.service.ts`.
*   Inject `ConfigService`.
*   Import the selected agent constants (`knowledgeOfMistakeAgent`, `knowledgeOfHowToFixAgent`, `knowledgeOfConceptAgent`, `knowledgeOfTestCasesAgent`).
*   Import `DomainKnowledgeService` and `createDomainKnowledgeTool`.
*   In `onModuleInit` or constructor:
    *   Instantiate `DomainKnowledgeService` (TODO: Use DI).
    *   Call `domainKnowledgeService.onModuleInit()` if needed.
    *   Create `domainKnowledgeTool` instance using `createDomainKnowledgeTool(domainKnowledgeService)`.
    *   Instantiate shared `ChatOpenAI` model.
    *   Load supervisor prompt from `supervisor/supervisor.prompt.txt`.
    *   **Re-instantiate KC agent:** Call `createFeedbackAgent` (from `agent.common.ts`) specifically for KC, passing the `domainKnowledgeTool` instance in the tools array.
    *   Create the final list of the four agent instances (`agentsForSupervisor`), ensuring the tool-equipped KC agent is included.
    *   Call `createSupervisor`, passing the model, the `agentsForSupervisor` list, and the loaded prompt template.
    *   Compile the graph: `this.feedbackGraph = supervisorWorkflow.compile();`.

**7. Integrate Graph into NestJS Service:**

*   Implement the `async getFeedback(...)` method in `LanggraphFeedbackService`:
    *   Check if `feedbackGraph` is initialized.
    *   Construct the initial `HumanMessage` containing all necessary context (task, solution, errors, attempt count) as a formatted string.
    *   Initialize the `State` object, primarily with the `messages` array.
    *   Invoke the graph: `const finalState = await this.feedbackGraph.invoke({ messages: initialState.messages });`.
    *   Extract the last relevant `AIMessage` content from `finalState.messages`.
    *   Return the feedback string or null.

**8. Testing Strategy:**

*   **Unit Tests:**
    *   Test `DomainKnowledgeService` (mock Prisma/vector store).
    *   Test `DomainKnowledgeTool` (mock service).
    *   Test individual feedback agent prompts/logic (mock LLM/tools).
    *   Test supervisor prompt formatting/logic (mock LLM).
    *   Test state initialization/processing in `LanggraphFeedbackService`.
*   **Integration Tests:**
    *   Test the full graph flow with mocked LLM/tool responses.
    *   Test with actual LLM/tool calls for key scenarios.

**9. NestJS Integration (Further Steps):**

*   Create necessary NestJS modules (`LanggraphFeedbackModule`, `DomainKnowledgeModule`, potentially agent/supervisor modules).
*   Implement proper Dependency Injection for `ConfigService`, `PrismaService`, `DomainKnowledgeService`, etc.
*   Expose the `LanggraphFeedbackService` for use in controllers.

**Mermaid Diagram (Conceptual - showing tool usage):**

```mermaid
graph TD
    A[Start: Input State] --> B{Supervisor Router};

    subgraph Agents
      direction LR
      KM & KH & KC & KTC
    end

    subgraph Tools
        DKT[Domain Knowledge Tool]
    end

    B -- Selects Agent --> Agents;
    B -- Selects __END__ --> E[End];

    Agents -- Generates Feedback --> F[Update State];
    KC -- Uses --> DKT;
    DKT -- Returns Info --> KC;


    F --> B; // Optional Loop
    E --> G[Final Output];
    F --> G;

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style DKT fill:#ccf,stroke:#333,stroke-width:1px
```
