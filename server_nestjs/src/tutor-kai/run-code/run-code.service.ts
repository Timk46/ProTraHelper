import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CodeSubmissionResult, CodeSubmissionResultDto } from '@Interfaces/index';
import { CodeSubmission, Question, CodingQuestion } from '@prisma/client';

@Injectable()
export class RunCodeService {
  constructor(
    private prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  // API URL for code execution service.
  private readonly apiUrl = 'http://jury1.unidashboard.de:3000/execute/';

  /**
   * Executes student-submitted code against predefined tests with Jury1.
   * @param studentCode An object containing file names as keys and file contents as values.
   * @param questionId The ID of the question to execute code against.
   * @param userId The ID of the user submitting the code.
   * @returns A promise resolving to the execution results.
   */
  async executeCode(
    studentCode: { [fileName: string]: string }, questionId: number, userId: number): Promise<CodeSubmissionResultDto> {

    // Retrieve the specified question and its associated coding question details from the database.
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        codingQuestions: {
          include: {
            codeGerueste: true,
            automatedTests: true,
          },
        },
      },
    });

    if (!question) {
      throw new HttpException('Diese Question existiert nicht.', HttpStatus.NOT_FOUND);
    }
    // Generate Base64-encoded strings of student code and test files for submission (needed for Jury1)
    const filesBase64 = await this.generateBase64(studentCode);
    const testFilesBase64 = await this.generateBase64({ [question.codingQuestions.automatedTests[0].testClassName]: question.codingQuestions.automatedTests[0].code });

    // Submit encoded files for execution and process the response.
    let response: CodeSubmissionResult;
    if (question.codingQuestions.automatedTests[0].language === "java") {
      response = await this.submitCodeForExecutionJava(filesBase64, testFilesBase64, question.codingQuestions.mainFileName);
    } else {
      response = await this.submitCodeForExecutionPython(filesBase64, testFilesBase64, question.codingQuestions.automatedTests[0].runMethod, question.codingQuestions.automatedTests[0].inputArguments);
    }
    const result = await this.processExecutionResponse(response, question.codingQuestions, question, userId, studentCode);
    return result;
  }
  /**
   * Submits encoded student java code and test files for execution with Jury1.
   * @param files Base64-encoded student code files.
   * @param testFiles Base64-encoded test files.
   * @param mainClassName Name of the Main Class which needs to be run to get console output (System.out.println)
   * @returns The execution result from the external API.
   */
  private async submitCodeForExecutionJava(files: { [fileName: string]: string }, testFiles: { [fileName: string]: string }, mainClassName: string): Promise<CodeSubmissionResult> {

    const tempClassName = "de.goals.testing." + mainClassName.split(".java")[0];
    //console.log("Jury1: Run Assignment Java:");
    //console.log(JSON.stringify({mainClassName: tempClassName, files, testFiles }));
    const response = await fetch(`${this.apiUrl}java-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({mainClassName: tempClassName, files, testFiles }),
    });

    if (!response.ok) {
      throw new HttpException(`Failed to execute code. Status: ${response.status}`, HttpStatus.BAD_GATEWAY);
    }

    const result: CodeSubmissionResult = await response.json();
    //console.log("Jury1: Run Assignment Java RESULTS: ");
    //console.log(result);
    return result;
  }

  /**
   * Submits encoded student python code and test files for execution with Jury1.
   * @param mainFile Base64-encoded student code files.
   * @param testFiles Base64-encoded test files.
   * @returns The execution result from the external API.
   */
  private async submitCodeForExecutionPython(mainFile: { [fileName: string]: string }, testFiles: { [fileName: string]: string }, runMethod: string, inputArguments: string): Promise<any> {
    //console.log("Jury1: Run Assignment Python:");
    //console.log(JSON.stringify({input: inputArguments, runMethod: runMethod, mainFile, testFiles }));
    const response = await fetch(`${this.apiUrl}python-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({runMethod: runMethod, input: inputArguments, mainFile, testFiles }),
    });

    if (!response.ok) {
      throw new HttpException(`Failed to execute code. Status: ${response.status}`, HttpStatus.BAD_GATEWAY);
    }
    const result = await response.json();
    //console.log("Jury1: Run Assignment Python RESULTS: ");
    //console.log(result);
    return result;
  }

  /**
   * Processes the response from the code execution API, logs the response, and saves the results to the database.
   */
  private async processExecutionResponse(response: CodeSubmissionResult, codingQuestion: CodingQuestion, question: Question, userId: number, studentCode: { [fileName: string]: string }): Promise<CodeSubmissionResultDto> {
    const codeSubmission = await this.saveToDatabase(response, codingQuestion, question, userId, studentCode);
    return {
      CodeSubmissionResult: response,
      encryptedCodeSubissionId: this.cryptoService.encrypt(codeSubmission.id.toString())
    };
  }

  /**
   * Saves the execution result to the database.
   */
  private async saveToDatabase(response: CodeSubmissionResult, codingQuestion: CodingQuestion, question: Question, userId: number, studentCode: { [fileName: string]: string }): Promise<CodeSubmission> {
    // Create a new code submission record with the execution result.
    const codeSubmission: CodeSubmission = await this.prisma.codeSubmission.create({
      data: {
        code: JSON.stringify(studentCode),
        compilerOutput: response.output? JSON.stringify(response.output) : "",
        unitTestResults: response.testResults? JSON.stringify(response.testResults) : "", // TODO: Extract and store compiler error messages.
        score: response.score? response.score : 0,
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
          create: [{ text: 'Feedback for Coding Task got its own table', score: response.score? response.score : 0}],
        },
      },
    });

    return codeSubmission;
  }

  /**
   * Encodes file contents to Base64.
   * @param files An object containing file names as keys and file contents as values.
   * @returns An object with the same keys and Base64-encoded contents as values.
   */
  async generateBase64(files: { [fileName: string]: string }): Promise<{ [fileName: string]: string }> {
    const base64Files: { [fileName: string]: string } = {};
    for (const fileName in files) {
      const fileContent = files[fileName].replace(/\r\n/g, '\n');
      const base64Content = Buffer.from(fileContent).toString('base64');
      base64Files[fileName] = base64Content;
    }
    return base64Files;
  }
}
