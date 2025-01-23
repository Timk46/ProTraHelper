import { Injectable } from '@nestjs/common';
import { CodeGameService } from '../code-game.service';
import {
  CodeGameEvaluationDTO,
  CppProjectExecutionResult,
} from '@DTOs/codeGame.dto';

@Injectable()
export class CodeGameEvaluationService {
  constructor(private readonly codeGameService: CodeGameService) {}

  async evaluateSubmission(
    questionId: number,
    submittedCode: { [fileName: string]: string },
    executionResult: CppProjectExecutionResult,
  ) {
    let frequencyOfMethodEvaluationResult = false;
    let frequencyOfMethodCallsResult = 0;
    const question = await this.codeGameService.findOne(questionId);

    if (!question) {
      // TODO: exit
    }

    /* Check if the code fulfills the restrictions */
    if (question.codeGameQuestion.codeSolutionRestriction) {
      const result = await this.testCodeForFrequencyOfMethodeCalls(
        submittedCode[question.codeGameQuestion.fileNameToRestrict],
        question.codeGameQuestion.methodNameToRestrict,
        question.codeGameQuestion.frequencyOfMethodNameToRestrict,
      );

      frequencyOfMethodEvaluationResult = result.testPassed;
      frequencyOfMethodCallsResult = result.frequencyOfMethodCallsResult;
    }

    /* Get evaluation results from the code execution */
    const successPattern = /#SYS-Success:(\d+)\/(\d+)\/(\d+)/;
    const match = executionResult.output.match(successPattern);

    let successesFromCodeExecution = {
      reachedDestination: false,
      totalRocks: 0,
      collectedRocks: 0,
      allRocksCollected: false,
    };

    try {
      if (match) {
        successesFromCodeExecution = {
          reachedDestination: parseInt(match[1], 10) === 1 ? true : false,
          totalRocks: parseInt(match[2], 10),
          collectedRocks: parseInt(match[3], 10),
          allRocksCollected: parseInt(match[2], 10) === parseInt(match[3], 10),
        };
      }
    } catch (error) {
      console.error(
        'CodeGame-Evaluation: Error parsing success numbers:',
        error,
      );
    }

    /* Create evaluation result */
    const evaluationResult: CodeGameEvaluationDTO = {
      questionId,
      submittedCode,
      codeGameExecutionResult: executionResult,
      frequencyOfMethodEvaluationResult,
      frequencyOfMethodCallsResult,
      ...successesFromCodeExecution,
    };

    return evaluationResult;
  }

  async testCodeForFrequencyOfMethodeCalls(
    code: string,
    methodName: string,
    frequencyOfMethodName: number,
  ) {
    let testPassed = false;
    let frequencyOfMethodCallsResult = 0;

    const regex = new RegExp(
      methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g',
    );
    const methodCalls = code.match(regex);

    if (methodCalls) {
      frequencyOfMethodCallsResult = methodCalls.length;

      if (frequencyOfMethodCallsResult <= frequencyOfMethodName) {
        testPassed = true;
      }
    } else {
      console.error(
        'CodeGame-Evaluation: Error testing code for frequency of method calls:',
        'No method calls found',
      );
    }

    return {
      testPassed,
      frequencyOfMethodCallsResult,
    };
  }
}
