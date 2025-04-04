# Plan: Langgraph Feedback Controller Implementation

This document outlines the plan for creating a new NestJS controller (`LanggraphFeedbackController`) and a supporting service (`LanggraphDataFetcherService`) to integrate the Langgraph-based feedback generation into the Tutor-Kai backend.

## Objective

Replace the existing `/run-code/evaluate-code` endpoint with a new endpoint `/langgraph-feedback/evaluate` that utilizes the `LanggraphFeedbackService` for generating feedback.

## Plan Details

### 1. Create `LanggraphDataFetcherService`

*   **Purpose:** Encapsulate the logic for fetching all necessary data required by `LanggraphFeedbackService.getFeedback` based on the submission ID and question ID.
*   **File Location:** `server_nestjs/src/tutor-kai/langgraph-feedback/langgraph-data-fetcher.service.ts`
*   **Dependencies:** Inject `PrismaService` and `CryptoService`.
*   **Core Method:** `async fetchFeedbackData(encryptedSubmissionId: string, questionId: number, codeSubmissionResult: CodeSubmissionResult)`
    *   Decrypt `encryptedSubmissionId` using `CryptoService` to get the numeric `submissionId`.
    *   Fetch the `CodeSubmission` record using `submissionId` via `PrismaService`. Include related user information if needed for `attemptCount`. Ensure the `code` field is selected.
    *   Fetch the `Question` record using `questionId` via `PrismaService`. Include the related `codingQuestion` and select its `text` (for `taskDescription`).
    *   Calculate `attemptCount`: Query `CodeSubmission` records, filtering by `userId` (from the fetched submission) and `questionId`, ordering by `createdAt`, and count the results up to the current submission.
    *   Extract Data:
        *   `studentSolution`: From the fetched `CodeSubmission.code`.
        *   `taskDescription`: From the fetched `Question.codingQuestion.text`.
        *   `compilerOutput`: From the input `codeSubmissionResult.output`.
        *   `unitTestResults`: From the input `codeSubmissionResult.testResults`.
    *   Return: An object containing `{ studentSolution, taskDescription, compilerOutput, unitTestResults, attemptCount }`.
*   **Error Handling:** Implement basic error handling (e.g., if submission or question not found).
*   **Module Integration:** Add this service to the `providers` and `exports` array in `LanggraphFeedbackModule`.

### 2. Create `LanggraphFeedbackController`

*   **Purpose:** Handle incoming requests for Langgraph feedback, orchestrate data fetching, call the feedback service, and return the result.
*   **File Location:** `server_nestjs/src/tutor-kai/langgraph-feedback/langgraph-feedback.controller.ts`
*   **Dependencies:** Inject `LanggraphFeedbackService` and `LanggraphDataFetcherService`.
*   **Routing:** Use `@Controller('langgraph-feedback')`. Apply `@UseGuards(JwtAuthGuard)` for authentication.
*   **Endpoint:** Define a `POST` endpoint at `/evaluate`.
*   **Request DTO:** Create an interface or class `EvaluateLanggraphDto` for the request body:
    ```typescript
    interface EvaluateLanggraphDto {
      questionId: number;
      flavor: string; // Included for future use
      feedbackLevel: string; // Included for future use
      relatedCodeSubmissionResult: CodeSubmissionResultDto;
    }
    ```
*   **Endpoint Logic:** `async evaluate(@Body() body: EvaluateLanggraphDto)`:
    *   Extract `questionId`, `relatedCodeSubmissionResult` from `body`.
    *   Extract `encryptedCodeSubissionId` and `CodeSubmissionResult` from `relatedCodeSubmissionResult`.
    *   Call `langgraphDataFetcherService.fetchFeedbackData(encryptedCodeSubissionId, questionId, CodeSubmissionResult)` to get the necessary data.
    *   Call `langgraphFeedbackService.getFeedback()` with the data returned by the fetcher service (`studentSolution`, `taskDescription`, `compilerOutput`, `unitTestResults`, `attemptCount`).
    *   Return the feedback string received from `langgraphFeedbackService`.
*   **Module Integration:** Add this controller to the `controllers` array in `LanggraphFeedbackModule`.

### 3. Update `LanggraphFeedbackModule`

*   **File Location:** `server_nestjs/src/tutor-kai/langgraph-feedback/langgraph-feedback.module.ts`
*   **Imports:** Ensure `PrismaModule` and the module providing `CryptoService` are imported.
*   **Providers:** Add `LanggraphDataFetcherService` to the `providers` array.
*   **Controllers:** Add `LanggraphFeedbackController` to the `controllers` array.
*   **Exports:** Add `LanggraphDataFetcherService` to the `exports` array.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Client (Angular runCode.service.ts)
    participant LanggraphFeedbackController
    participant JwtAuthGuard
    participant LanggraphDataFetcherService
    participant CryptoService
    participant PrismaService
    participant LanggraphFeedbackService

    Client->>+LanggraphFeedbackController: POST /langgraph-feedback/evaluate (body: EvaluateLanggraphDto)
    LanggraphFeedbackController->>+JwtAuthGuard: Validate Request
    JwtAuthGuard-->>-LanggraphFeedbackController: OK
    LanggraphFeedbackController->>+LanggraphDataFetcherService: fetchFeedbackData(encryptedSubmissionId, questionId, CodeSubmissionResult)
    LanggraphDataFetcherService->>+CryptoService: decrypt(encryptedSubmissionId)
    CryptoService-->>-LanggraphDataFetcherService: submissionId
    LanggraphDataFetcherService->>+PrismaService: findUnique CodeSubmission (id=submissionId)
    PrismaService-->>-LanggraphDataFetcherService: codeSubmission { code, userId }
    LanggraphDataFetcherService->>+PrismaService: findUnique Question (id=questionId, include codingQuestion)
    PrismaService-->>-LanggraphDataFetcherService: question { codingQuestion.text }
    LanggraphDataFetcherService->>+PrismaService: count CodeSubmission (where userId, questionId, createdAt <= submission.createdAt)
    PrismaService-->>-LanggraphDataFetcherService: attemptCount
    LanggraphDataFetcherService-->>-LanggraphFeedbackController: data { studentSolution, taskDescription, compilerOutput, unitTestResults, attemptCount }
    LanggraphFeedbackController->>+LanggraphFeedbackService: getFeedback(data.studentSolution, data.taskDescription, data.compilerOutput, data.unitTestResults, data.attemptCount)
    LanggraphFeedbackService-->>-LanggraphFeedbackController: feedbackString
    LanggraphFeedbackController-->>-Client: { feedback: feedbackString }
