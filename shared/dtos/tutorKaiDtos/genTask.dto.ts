export interface genTaskDto {
    id: number;
    task: string;
    expectation: string;
    solution: string;
    unitTest: string;
    codeFramework: string;
    hasFailure: boolean;
    iterations: number
    runMethod: string;
    runMethodInput: string;
  }