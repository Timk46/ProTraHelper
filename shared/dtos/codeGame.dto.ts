export interface CppProjectExecutionResult { // TODO: change to CodeGameExecutionResultDTO
    output: string;
}

export interface CodeGameEvaluationDTO {
    questionId: number;
    submittedCode: { [fileName: string]: string };
    codeGameExecutionResult: CppProjectExecutionResult;
    frequencyOfMethodEvaluationResult: boolean;
    frequencyOfMethodCallsResult: number;
    reachedDestination: boolean;
    allRocksCollected: boolean;
    totalRocks: number;
    collectedRocks: number;
}
