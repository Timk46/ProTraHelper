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
    language: string,
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

    /* Check if the visited cells are allowed */
    let blackAndWhiteListCheckResult = {
      visitedCellsAreAllowed: false,
      allWhiteListCellsVisited: false,
    };
    if (question.codeGameQuestion.gameCellRestrictions) {
      blackAndWhiteListCheckResult =
        await this.checkVisitedCellsAgainstBlackAndWhiteList(
          question.codeGameQuestion.game,
          executionResult,
          question.codeGameQuestion.gameCellRestrictions,
        );
    }

    /* Create evaluation result */
    const evaluationResult: CodeGameEvaluationDTO = {
      questionId,
      language,
      submittedCode,
      codeGameExecutionResult: executionResult.output,
      codeSolutionRestriction: question.codeGameQuestion.codeSolutionRestriction,
      frequencyOfMethodEvaluationResult,
      frequencyOfMethodCallsResult,
      ...successesFromCodeExecution,
      ...blackAndWhiteListCheckResult,
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

  async checkVisitedCellsAgainstBlackAndWhiteList(
    game: string,
    executionResult: CppProjectExecutionResult,
    gameCellRestrictions: string,
  ) {
    const gameArray = await this.transformStringToArray(game);
    const gameCellRestrictionsArray = await this.transformStringToArray(
      gameCellRestrictions,
    );

    /* Extract starting position from the game */
    const startingPlayerPosition = { row: -1, col: -1 };
    for (let row = 0; row < gameArray.length; row++) {
      for (let col = 0; col < gameArray[row].length; col++) {
        if (gameArray[row][col] === 'P') {
          startingPlayerPosition.row = row;
          startingPlayerPosition.col = col;
          break;
        }
      }
    }

    if (
      startingPlayerPosition.row === -1 ||
      startingPlayerPosition.col === -1
    ) {
      console.error('CodeGame-Evaluation: Error extracting starting position');
      return;
    }

    /* Extract visited cells from the commandline output */
    const movePattern = /#SYS-Move:(\d+)\/(\d+)/g;
    const visitedCells = [];
    let match;

    // Add player starting position to the visited cells
    visitedCells.push({
      row: startingPlayerPosition.row,
      col: startingPlayerPosition.col,
    });

    // The play field has row's on the x-axis and rows on the y-axis
    // Therefor the col is the x-axis and the row is the y-axis
    while ((match = movePattern.exec(executionResult.output)) !== null) {
      visitedCells.push({
        row: parseInt(match[2], 10),
        col: parseInt(match[1], 10),
      });
    }

    /* Check if the visited cells are allowed (not marked as a cell of the black list) */
    let visitedCellsAreAllowed = true;
    for (const visitedCell of visitedCells) {
      if (gameCellRestrictionsArray[visitedCell.row][visitedCell.col] === 'B') {
        visitedCellsAreAllowed = false;
        break;
      }
    }

    /* Check if all white list cells are visited */
    let allWhiteListCellsVisited = true;
    for (let row = 0; row < gameCellRestrictionsArray.length; row++) {
      for (let col = 0; col < gameCellRestrictionsArray[row].length; col++) {
        if (gameCellRestrictionsArray[row][col] === 'W') {
          let whiteListCellVisited = false;
          for (const visitedCell of visitedCells) {
            if (visitedCell.row === row && visitedCell.col === col) {
              whiteListCellVisited = true;
              break;
            }
          }
          if (!whiteListCellVisited) {
            allWhiteListCellsVisited = false;
            break;
          }
        }
      }
    }

    return {
      visitedCellsAreAllowed,
      allWhiteListCellsVisited,
    };
  }

  async transformStringToArray(string: string): Promise<any[][]> {
    return string.split('\n').map((row) => row.split(''));
  }
}
