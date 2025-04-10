export interface CppProjectExecutionResult { // TODO: change to CodeGameExecutionResultDTO
    output: string;
}

export interface PythonProjectExecutionResult { // TODO: change to CodeGameExecutionResultDTO
    output: string;
}

export interface JavaProjectExecutionResult { // TODO: change to CodeGameExecutionResultDTO
    output: string;
}

export interface CodeGameEvaluationDTO { // TODO: change to CodeGameAnswerDTO
    questionId: number;
    language: string;
    submittedCode: { [fileName: string]: string };
    codeGameExecutionResult: string;
    codeSolutionRestriction: boolean; // TODO:  isfrequencyOfMethodOfMethodCallsRestricted
    frequencyOfMethodEvaluationResult: boolean;
    frequencyOfMethodCallsResult: number;
    reachedDestination: boolean;
    allItemsCollected: boolean;
    totalItems: number;
    collectedItems: number;
    visitedCellsAreAllowed: boolean;
    allWhiteListCellsVisited: boolean;
    executionSuccess?: boolean;
    executionMessage?: string;
}

export interface CodeGameScaffoldDTO {
    id: number;
    codeFileName: string;
    code: string;
    codeGameQuestionId?: number;
    language?: string;
    visible: boolean;
    mainFile: boolean;
}

export interface DefaultCodeGameScaffoldsDTO {
    cpp: CodeGameScaffoldDTO[];
    python: CodeGameScaffoldDTO[];
    java: CodeGameScaffoldDTO[];
}