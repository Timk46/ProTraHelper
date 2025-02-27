export interface CppProjectExecutionResult { // TODO: change to CodeGameExecutionResultDTO
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
    allRocksCollected: boolean;
    totalRocks: number;
    collectedRocks: number;
    visitedCellsAreAllowed: boolean;
    allWhiteListCellsVisited: boolean;
}
