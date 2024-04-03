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
    const testfileName = question.codingQuestions.automatedTests[0].language === "python"
      ? "test_main.py"
      : `${question.codingQuestions.mainFileName.split(".java")[0]}Test.java`; // TODO: This is a hacky solution. Refactor this.

    const testFilesBase64 = await this.generateBase64({ [testfileName]: question.codingQuestions.automatedTests[0].code });

    // Submit encoded files for execution and process the response.
    const response = await this.submitCodeForExecution(filesBase64, testFilesBase64, question.codingQuestions.automatedTests[0].language);
    const result = this.processExecutionResponse(response, question.codingQuestions, question, userId, studentCode);
    return result;
  }

  /**
   * Submits encoded student code and test files for execution with Jury1.
   * @param files Base64-encoded student code files.
   * @param testFiles Base64-encoded test files.
   * @param language The programming language of the submission.
   * @returns The execution result from the external API.
   */
  private async submitCodeForExecution(files: { [fileName: string]: string }, testFiles: { [fileName: string]: string }, language: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}${language}-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, testFiles }),
    });

    if (!response.ok) {
      throw new HttpException(`Failed to execute code. Status: ${response.status}`, HttpStatus.BAD_GATEWAY);
    }
    return response.json();
  }

  /**
   * Processes the response from the code execution API, logs the response, and saves the results to the database.
   */
  private async processExecutionResponse(response: CodeSubmissionResult, codingQuestion: CodingQuestion, question: Question, userId: number, studentCode: { [fileName: string]: string }): Promise<CodeSubmissionResultDto> {
    console.log(response);
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
        compilerOutput: JSON.stringify(response.testResults),
        compilerError: "", // TODO: Extract and store compiler error messages.
        compilerResponse: "", // TODO: Extract and store the full compiler response.
        score: response.score,
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
          create: [{ text: 'Feedback for Coding Task got its own table', score: response.score }],
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
