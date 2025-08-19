import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CryptoService } from '../langgraph-feedback/helper/crypto.service';
import { CodingQuestionInternal, detailedQuestionDTO } from '@DTOs/index';
import { CodeSubmissionResult, CodeSubmissionResultDto } from '@Interfaces/index';
import { ContentElementDTO, NotificationDTO, questionType } from '@Interfaces/index';
import { CodeSubmission, Question, CodingQuestion, ContentElement } from '@prisma/client';
import { ContentService } from '@/content/content.service';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class RunCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly contentService: ContentService,
    private readonly notificationService: NotificationService,
  ) {}

  // API URL for code execution service.
  private readonly apiUrl = 'http://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/';

  // Need a third way for teachers to test in student view. #TODO

  /**
   * During edit-coding to test model solution and unit-tests
   */
  async executeCodeForTaskCreation(
    detailedQuestion: detailedQuestionDTO,
    userId: number,
  ): Promise<any> {
    const codingQuestion = detailedQuestion.codingQuestion;
    if (!codingQuestion.modelSolutions || codingQuestion.modelSolutions.length === 0) {
      throw new Error('No model solutions found for this coding question.');
    }

    const modelSolution = codingQuestion.modelSolutions.reduce((acc, solution) => {
      acc[solution.codeFileName] = solution.code;
      return acc;
    }, {});

    const response: CodeSubmissionResult = await this.executeCode(modelSolution, codingQuestion);
    return response;
  }

  /**
   * Executes student-submitted code against predefined tests with Jury1.
   * @param studentCode An object containing file names as keys and file contents as values.
   * @param questionId The ID of the question to execute code against.
   * @param userId The ID of the user submitting the code.
   * @returns A promise resolving to the execution results.
   */
  async executeCodeForSubmission(
    studentCode: { [fileName: string]: string },
    questionId: number,
    userId: number,
  ): Promise<CodeSubmissionResultDto> {
    // Retrieve the specified question and its associated coding question details from the database.
    const question = await this.findRelatedQuestion(questionId);
    // Generate Base64-encoded strings of student code and test files for submission (needed for Jury1)
    const response: CodeSubmissionResult = await this.executeCode(
      studentCode,
      question.codingQuestion,
    );
    const result = await this.processExecutionResponse(
      response,
      question.codingQuestion,
      question.contentElement,
      question,
      userId,
      studentCode,
    );

    return result;
  }
  private async findRelatedQuestion(questionId: number) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        codingQuestion: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
        contentElement: true,
        conceptNode: true,
      },
    });
    if (!question) {
      throw new HttpException('Diese Question existiert nicht.', HttpStatus.NOT_FOUND);
    }
    return question;
  }

  private async executeCode(
    studentCode: { [fileName: string]: string },
    codingQuestion: CodingQuestionInternal,
  ) {
    // Submit encoded files for execution and process the response.
    let response: CodeSubmissionResult;
    if (codingQuestion.programmingLanguage === 'java') {
      const testFilesBase64 = await this.generateBase64({
        [codingQuestion.automatedTests[0].testFileName]: codingQuestion.automatedTests[0].code,
      });
      const filesBase64 = await this.generateBase64(studentCode);
      response = await this.submitCodeForExecutionJava(
        filesBase64,
        testFilesBase64,
        codingQuestion.mainFileName,
      );
    } else if (codingQuestion.programmingLanguage === 'python') {
      const testFilesBase64 = await this.generateBase64({
        [codingQuestion.automatedTests[0].testFileName]: codingQuestion.automatedTests[0].code,
      });
      const filesBase64 = await this.generateBase64(studentCode);
      response = await this.submitCodeForExecutionPython(
        filesBase64,
        testFilesBase64,
        codingQuestion.automatedTests[0].runMethod,
        codingQuestion.automatedTests[0].inputArguments,
      );
      console.log(filesBase64);
      console.log(testFilesBase64);
      console.log(codingQuestion.automatedTests[0].runMethod);
      console.log(codingQuestion.automatedTests[0].inputArguments);
    } else if (codingQuestion.programmingLanguage === 'cpp') {
      const testFilesBase64 = await this.generateBase64({
        [codingQuestion.automatedTests[0].testClassName]: codingQuestion.automatedTests[0].code,
      });
      response = await this.submitCodeForExecutionCpp(studentCode, testFilesBase64);
    } else {
      throw new HttpException(
        `Unsupported language: ${codingQuestion.programmingLanguage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return response;
  }

  /**
   * Submits encoded student java code and test files for execution with Jury1.
   * @param files Base64-encoded student code files.
   * @param testFiles Base64-encoded test files.
   * @param mainClassName Name of the Main Class which needs to be run to get console output (System.out.println)
   * @returns The execution result from the external API.
   */
  private async submitCodeForExecutionJava(
    files: { [fileName: string]: string },
    testFiles: { [fileName: string]: string },
    mainClassName: string,
  ): Promise<CodeSubmissionResult> {
    const tempClassName = 'de.goals.testing.' + mainClassName.split('.java')[0];

    const response = await fetch(`${this.apiUrl}java-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mainClassName: tempClassName, files, testFiles }),
    });

    if (!response.ok) {
      throw new HttpException(
        `Failed to execute code. Status: ${response.status}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const result: CodeSubmissionResult = await response.json();
    return result;
  }

  /**
   * Submits encoded student python code and test files for execution with Jury1.
   * @param mainFile Base64-encoded student code files.
   * @param testFiles Base64-encoded test files.
   * @returns The execution result from the external API.
   */
  private async submitCodeForExecutionPython(
    mainFile: { [fileName: string]: string },
    testFiles: { [fileName: string]: string },
    runMethod: string,
    inputArguments: string,
  ): Promise<any> {
    const response = await fetch(`${this.apiUrl}python-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runMethod: runMethod,
        input: inputArguments,
        mainFile,
        testFiles,
      }),
    });

    if (!response.ok) {
      throw new HttpException(
        `Failed to execute code. Status: ${response.status}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    const result = await response.json();
    return result;
  }

  /**
   * Submits encoded student C++ code and test files for execution with Jury1.
   * @param files Student code files.
   * @param testFiles Base64-encoded test files.
   * @returns The execution result from the external API.
   */
  public async submitCodeForExecutionCpp(
    files: { [fileName: string]: string },
    testFiles: { [fileName: string]: string },
  ): Promise<CodeSubmissionResult> {
    // Modifizieren der Dateien, um die main-Funktion zu umschließen
    const modifiedFiles: { [fileName: string]: string } = {};

    for (const [fileName, content] of Object.entries(files)) {
      const modifiedContent = this.wrapMainFunction(content);
      modifiedFiles[fileName] = modifiedContent;
    }

    // Konvertierung zu Base64
    const filesBase64 = await this.generateBase64(modifiedFiles);

    console.log('JURY 1 CPP Anfrage');
    console.log(
      JSON.stringify({
        files: filesBase64,
        testFile: Object.values(testFiles)[0],
      }),
    );

    const response = await fetch(`${this.apiUrl}cpp-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: filesBase64,
        testFile: Object.values(testFiles)[0],
      }),
    });

    if (!response.ok) {
      throw new HttpException(
        `Failed to execute C++ code. Status: ${response.status}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const result: CodeSubmissionResult = await response.json();
    console.log('JURY 1 CPP Antwort');
    console.log(JSON.stringify(result));
    return result;
  }

  // add Präprozessor-Direktiven
  // Um die Unit-Tests ohne Konflikte ausführen zu können, haben wir die main-Funktion mit Präprozessor-Direktiven umgeben
  private wrapMainFunction(content: string): string {
    // Suche nach 'int main(...) {'
    const mainFunctionRegex = /int\s+main\s*\([^)]*\)\s*\{/m;

    const match = mainFunctionRegex.exec(content);
    if (match) {
      const mainFunctionStart = match.index;
      const openingBraceIndex = content.indexOf('{', mainFunctionStart);
      if (openingBraceIndex !== -1) {
        // Finde die schließende Klammer der main-Funktion
        let braceCount = 1;
        let currentIndex = openingBraceIndex + 1;
        while (braceCount > 0 && currentIndex < content.length) {
          if (content[currentIndex] === '{') {
            braceCount++;
          } else if (content[currentIndex] === '}') {
            braceCount--;
          }
          currentIndex++;
        }

        if (braceCount === 0) {
          const mainFunctionEnd = currentIndex; // Position nach der schließenden '}'

          const beforeMain = content.substring(0, mainFunctionStart);
          const mainFunction = content.substring(mainFunctionStart, mainFunctionEnd);
          const afterMain = content.substring(mainFunctionEnd);

          console.log('Main Methode mit Präprozessor-Direktiven umschlossen.');
          return `${beforeMain}\n#ifndef UNIT_TEST\n${mainFunction}\n#endif // UNIT_TEST\n${afterMain}`;
        } else {
          console.log('Konnte die schließende Klammer der main-Funktion nicht finden.');
        }
      }
    } else {
      console.log('Keine main-Funktion gefunden.');
    }
    return content;
  }

  /**
   * Processes the response from the code execution API, logs the response, and saves the results to the database.
   */
  private async processExecutionResponse(
    response: CodeSubmissionResult,
    codingQuestion: CodingQuestion,
    contentElement: ContentElement,
    question: Question,
    userId: number,
    studentCode: { [fileName: string]: string },
  ): Promise<CodeSubmissionResultDto> {
    // Check for single compilation/syntax error result
    transformTestsResultsAfterSyntaxError(response);

    const codeSubmission = await this.saveToDatabase(
      response,
      codingQuestion,
      contentElement,
      question,
      userId,
      studentCode,
    );

    return {
      CodeSubmissionResult: response,
      encryptedCodeSubissionId: this.cryptoService.encrypt(codeSubmission.id.toString()),
    };
  }

  /**
   * Saves the execution result to the database.
   */
  private async saveToDatabase(
    response: CodeSubmissionResult,
    codingQuestion: CodingQuestion,
    contentElement: ContentElement,
    question: Question,
    userId: number,
    studentCode: { [fileName: string]: string },
  ): Promise<CodeSubmission> {
    // Create a new code submission record with the execution result.
    const codeSubmission: CodeSubmission = await this.prisma.codeSubmission.create({
      data: {
        code: JSON.stringify(studentCode),
        compilerOutput: response.output ? JSON.stringify(response.output) : '',
        unitTestResults: response.testResults ? JSON.stringify(response.testResults) : '', // TODO: Extract and store compiler error messages.
        score: response.score ? response.score : 0,
        user: { connect: { id: userId } },
        codingQuestion: { connect: { id: codingQuestion.id } },
      },
    });

    // Record user answer and feedback separately.
    await this.prisma.userAnswer.create({
      data: {
        userId: userId,
        questionId: question.id,
        feedbacks: {
          create: [
            {
              text: 'Feedback for Coding Task got its own table',
              score: response.score ? response.score : 0,
            },
          ],
        },
      },
    });

    const progress = question.score / response.score;
    let markedAsDone = false;
    if (progress === 1) {
      markedAsDone = true;
      await this.contentService.questionContentElementDone(
        contentElement.id,
        question.conceptNodeId,
        question.level,
        userId,
      );
    }

    return codeSubmission;
  }

  /**
   * Encodes file contents to Base64.
   * @param files An object containing file names as keys and file contents as values.
   * @returns An object with the same keys and Base64-encoded contents as values.
   */
  async generateBase64(files: {
    [fileName: string]: string;
  }): Promise<{ [fileName: string]: string }> {
    const base64Files: { [fileName: string]: string } = {};
    for (const fileName in files) {
      const fileContent = files[fileName].replace(/\r\n/g, '\n');
      const base64Content = Buffer.from(fileContent).toString('base64');
      base64Files[fileName] = base64Content;
    }
    return base64Files;
  }
}
function transformTestsResultsAfterSyntaxError(response: CodeSubmissionResult) {
  if (
    // translate to "Syntax Check"
    response.testResults &&
    Array.isArray(response.testResults) &&
    response.testResults.length === 1 &&
    (response.testResults[0].test === 'test_main (unittest.loader._FailedTest.test_main)' ||
      response.testResults[0].test === 'MAIN_COMPILATION')
  ) {
    response.testResults[0].test = 'Syntax Check'; // Update 'test'
    response.testResults[0].exception =
      'Es wurden keine weiteren Tests durchgeführt, da das Programm noch nicht lauffähig ist. Betrachte den Compiler Output für Hinweise';
  }
  if (
    // translate to "Syntax Check"
    response.testResults &&
    Array.isArray(response.testResults) &&
    response.testResults.length === 1 &&
    response.testResults[0].test === 'TEST_COMPILATION'
  ) {
    response.testResults[0].test = 'Syntax Check - Test Cases'; // Update 'test'
    response.testResults[0].exception = 'Die Tests konnten nicht kompiliert werden.';
  }
}
