# Tutorial Feedback System Implementation Plan

This document outlines the plan for developing the tutorial feedback system using Nest.js and LangGraph.

## 1. Prerequisite

*   Ensure the `DomainKnowledgeService` is implemented, configured, and connected to the vector database containing lecture materials. *(This needs to be addressed before or during the implementation phase).*

## 2. Project Setup & Module Creation

*   Create a new Nest.js module named `TutoringFeedbackModule` within the directory: `server_nestjs/src/tutor-kai/tutoring-feedback/`.
*   Define the core components within this module:
    *   `TutoringFeedbackController`: To handle incoming HTTP requests.
    *   `TutoringFeedbackService`: To encapsulate the core logic and interact with LangGraph.
    *   Associated DTOs (if needed beyond `FeedbackContextDto`) and potentially helper services.

## 3. LangGraph Workflow Design

*   **State Definition:** Define a TypeScript interface or class for the LangGraph state. This state object will carry data through the graph execution.
    *   Initial state: Contains the input `FeedbackContextDto`.
    *   Intermediate/Final state properties: `fixedCode: string`, `concepts: string[]`, `lectureSnippets: any[]`, `finalFeedback: object`.
*   **Node Implementation:** Implement the functions for each node in the graph:
    *   **`generate_fixed_code` Node:**
        *   Input: `FeedbackContextDto` from state.
        *   Action: Use `gpt-3.5-turbo` (or closest available equivalent) to generate a corrected version of `studentSolution` based on `taskDescription`. Prompt will emphasize fixing errors while preserving the student's logic where possible.
        *   Output: Update state with `fixedCode`.
        *   Error Handling: Implement 1 retry on API failure.
    *   **`extract_concepts` Node:**
        *   Input: `FeedbackContextDto` from state.
        *   Action: Use `gpt-4o-mini` to identify and extract the 2 most relevant programming concepts related to the task or potential student errors.
        *   Output: Update state with `concepts`.
        *   Error Handling: Implement 1 retry on API failure.
    *   **`fetch_lecture_snippets` Node (Tool Node):**
        *   Input: `concepts` from state.
        *   Action: Iterate through the extracted `concepts`. For each concept, invoke the existing `createDomainKnowledgeTool` (using the injected `DomainKnowledgeService`) to query the vector database. Aggregate the retrieved snippets.
        *   Output: Update state with `lectureSnippets`.
        *   Error Handling: Implement 1 retry on API failure. Depends on Prerequisite 1.
    *   **`generate_final_feedback` Node:**
        *   Input: `FeedbackContextDto`, `fixedCode`, `lectureSnippets` from state.
        *   Action: Use `gpt-4o` (or closest available equivalent) with a detailed prompt adhering to `PromptingGuide.md` and `FeedbackGuide.md`.
            *   Instruct the LLM to act as a pedagogical tutor.
            *   Request structured JSON output with keys: `{ IT: string, KCR: { explanation: string, steps: string[] }, KM: string, KTC: string, KC: string, KH: string }`.
            *   Provide the necessary context (`FeedbackContextDto`, `fixedCode`, `lectureSnippets`).
        *   Output: Update state with `finalFeedback` (the structured JSON).
        *   Error Handling: Implement 1 retry on API failure.
*   **Graph Construction:**
    *   Instantiate `LangGraph`.
    *   Add the defined nodes.
    *   Define edges for parallel execution:
        *   `START` branches to `generate_fixed_code` and `extract_concepts`.
        *   `extract_concepts` leads to `fetch_lecture_snippets`.
        *   Introduce a join mechanism (e.g., using a dedicated node or LangGraph's built-in capabilities) to wait for `generate_fixed_code` and `fetch_lecture_snippets` to complete.
        *   The join mechanism leads to `generate_final_feedback`.
    *   Compile the graph.

## 4. Service and Controller Implementation

*   **`TutoringFeedbackService`:**
    *   Inject dependencies (LLM providers, `DomainKnowledgeService`, potentially configuration service).
    *   Implement a primary method (e.g., `generateFeedback(context: FeedbackContextDto): Promise<object>`).
    *   This method will initialize the graph state with the input DTO, invoke the compiled LangGraph, manage state.
    *   Handle errors: After 1 retry on API failure within a node, the graph execution should halt, and the service should report the error (e.g., throw an appropriate NestJS `HttpException`).
*   **`TutoringFeedbackController`:**
    *   Define a POST endpoint (e.g., `/tutor-kai/tutoring-feedback`).
    *   Inject `TutoringFeedbackService`.
    *   The endpoint method will receive `FeedbackContextDto` from the request body, call the service method, and return the generated JSON feedback. Handle potential service errors.

## 5. Configuration and Error Handling

*   Manage LLM API keys and model identifiers via environment variables and Nest.js configuration modules (`ConfigModule`).
*   Ensure retry/halt logic is consistently applied across relevant graph nodes and within the service layer.

## 6. Visual Plan (Mermaid Diagram)

```mermaid
graph TD
    A[Start: Receive FeedbackContextDto] --> B(Generate Fixed Code <br> gpt-3.5-turbo);
    A --> C(Extract Concepts <br> gpt-4o-mini);
    C --> D{Fetch Lecture Snippets <br> (domain-knowledge tool)};
    B --> J(Join);
    D -- Lecture Snippets --> J;
    J --> E(Generate Final Feedback <br> gpt-4o);
    E --> F[Output: Structured JSON <br> { IT: string, KCR: { explanation: string, steps: [] }, KM: string, KTC: string, KC: string, KH: string }];

    subgraph Input Context
        Ctx[FeedbackContextDto]
    end

    subgraph External Systems
        VDB[(Vector DB <br> Lecture Material <br> *Needs Setup*)]
        LLM1[gpt-3.5-turbo]
        LLM2[gpt-4o-mini]
        LLM3[gpt-4o]
    end

    subgraph Notes
        Note1("Retry logic (1x) on API failures, then halt")
        Note2("Parallel execution for B & C->D")
        Note3("KCR includes nested 'steps' array")
    end


    Ctx --> A;
    B --> LLM1;
    C --> LLM2;
    D --> VDB;
    E --> LLM3;

    style F fill:#ccf,stroke:#333,stroke-width:2px;
