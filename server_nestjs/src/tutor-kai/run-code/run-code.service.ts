import { QuestionService } from './../question/question.service';
import { HttpException, HttpStatus, Inject, Injectable, Req, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CodeSubmission, CodingQuestion } from '@prisma/client';
import { CryptoService } from '../crypto/crypto.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import * as JSZip from 'jszip';
import { CodeSubmissionResultDto, CodingQuestionDto, Judge0Dto, CodingQuestionInternal } from '@DTOs/index';
import { ProgrammingLanguageDto } from '@DTOs/index';

/**
 * An array that contains programming languages with their ids and names currently supported by Judge0.
 */
const languages: ProgrammingLanguageDto[] = [
  { id: 62, name: 'java', is_archived: false },
  { id: 89, name: 'multipleFiles', is_archived: false }, // 89 is for multiple Files. Its always java
  { id: 63, name: 'javascript', is_archived: false },
  { id: 74, name: 'typescript', is_archived: false },
  { id: 71, name: 'python', is_archived: false },
];

@Injectable({ scope: Scope.REQUEST })
export class RunCodeService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly questionService: QuestionService,
  ) {}

  private readonly apiUrl = process.env.JUDGE0_URL + '/submissions';

  /**
   * Execute a code submission with judge0.
   * @param {string} code - The code to be executed.
   * @param {string} language - The programming language of the code.
   * @param {number} taskId - The identifier of the task associated with the code.
   * @return {Promise<CodeSubmissionResultDto>} Returns a promise that resolves to CodeSubmissionResultDto.
   */
  async executeCode(req, code: string, language: string, taskId: number,): Promise<CodeSubmissionResultDto > {
    const codingQuestion: CodingQuestionInternal = await this.questionService.findCodingQuestionById(taskId);
    const requestBody = {
      source_code: code + '\n' + codingQuestion.automatedTests[0].code, // currently only one test per task (each containing multiple test cases)
      language_id: this.getLanguageIdByName(language),
      stdin: '',
      expected_output: '',
    };
    const submissionResponse = await fetch(this.apiUrl+ '/?base64_encoded', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!submissionResponse.ok) {
      throw new HttpException(
        'Failed to submit the code to Judge0',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const submission = await submissionResponse.json();
    const submissionId = submission.token;
    let resultjudge0Response ;
    let result: Judge0Dto;

    do {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Polling delay to get result from the Judge0 Database

      resultjudge0Response = await fetch(`${this.apiUrl}/${submissionId}?base64_encoded=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resultjudge0Response.ok) {
        throw new HttpException(
          'Failed to get the code execution result from Judge0',
          HttpStatus.BAD_GATEWAY,
        );
      }

      result = await resultjudge0Response.json();
       if (result.stdout) {
         // decode from base64
         result.stdout = Buffer.from(result.stdout, 'base64').toString();
       }
       if (result.stderr) {
         result.stderr = Buffer.from(result.stderr, 'base64').toString();
       }
       if (result.compile_output) {
         result.compile_output = Buffer.from(
           result.compile_output,
           'base64',
         ).toString();
       }
    } while (result.status.id <= 2); // Polling the result until the code is processed

    // get user id who made the request by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: req.user.email,
      },
    });


    // save submission result to database -> this row gets updated with the feedback from the AI (if the user requests it)
    const prismaResult: CodeSubmission = await this.prisma.codeSubmission.create({
      data: {
        code: code,
        compilerOutput: result.stdout,
        compilerError: result.stderr,
        compilerResponse: result.compile_output,
        user: {
          connect: {
            id: user.id,
          },
        },
        codingQuestion: {
          connect: {
            id: taskId,
          },
        },
      },
    });

    return {
      resultjudge0: result,
      encryptedSubmissionId: this.cryptoService.encrypt(prismaResult.id.toString()),
    };
  }

    /**
   * Run code consisting of multiple files
   * @param {string} code - The code to be executed.
   * @param {string} language - The programming language of the code.
   * @param {number} taskId - The identifier of the task associated with the code.
   * @param {string[]} inputArgs - An array of input arguments (we get those from input fields in the tutor-kai webapp) to be used in the code execution.
   * @param additionalFiles - An object where each key-value pair represents a file name and its content (code).
   * @return {Promise<CodeSubmissionResultDto>} Returns a promise that resolves to CodeSubmissionResultDto.
   */
   async runMultipleFiles(
     req,
     code: string,
     language: string,
     taskId: number,
     inputArgs: string[],
     additionalFiles: { [fileName: string]: string },
   ): Promise<CodeSubmissionResultDto> {
     const codingQuestion: CodingQuestionInternal = await this.questionService.findCodingQuestionById(taskId);
     additionalFiles['Dynamisch.java'] = codingQuestion.automatedTests[0].code; // currently only one test per task (each containing multiple test cases)
     const inputStringArray = this.createInputArgsString(inputArgs); // some tasks need user input
     const className = codingQuestion.mainFileName.split('.')[0]; // Classname of the student java class with main method (xy.java -> xy)
     additionalFiles[ // Main.java that runs the tests for each test method defined in Dynamisch.java
       'Main.java'
     ] = `import java.lang.reflect.Method; public class Main { public static void main(String[] args) throws Exception {\n boolean correctSynatx = true; int punkte = 0;try {\n ${className}.main(${inputStringArray});\n }catch (Exception e) {\n System.out.println("Fehler beim Ausführen des Studentencodes.");\n correctSynatx = false; return; }if (correctSynatx) { try { Dynamisch testObj = new Dynamisch(); Method[] methods = Dynamisch.class.getMethods(); System.out.println("******** Begin Tests ********"); for (Method method : methods) { if (method.isAnnotationPresent(Test.class)) { try { method.invoke(testObj); } catch (Exception e) { System.out.println("Fehler beim Ausführen des Tests " + method.getName()); } } } punkte = testObj.getResult(); } catch (Exception e) { System.out.println("Fehler im Programmcode."); } } System.out.println("Die erreichte Punktzahl ist: " + punkte); } }`;

     if (className === 'Summenwert' || className === 'VektorWork' || className === 'Leser' || className === 'Auto') {
       // Tasks that doesn't have a main method. ToDo: Make this dynamic and load from DB.
       additionalFiles[
         'Main.java'
       ] = `import java.lang.reflect.Method; public class Main { public static void main(String[] args) throws Exception {\n boolean correctSynatx = true; int punkte = 0; if (correctSynatx) { try {\n Dynamisch testObj = new Dynamisch();\n Method[] methods = Dynamisch.class.getMethods();\n System.out.println("******** Begin Tests ********");\n for (Method method : methods) { if (method.isAnnotationPresent(Test.class)) { try { method.invoke(testObj); } catch (Exception e) { System.out.println("Fehler beim Ausführen des Tests " + method.getName()); e.printStackTrace();} } } punkte = testObj.getResult(); } catch (Exception e) { System.out.println("Fehler im Programmcode."); } } System.out.println("Die erreichte Punktzahl ist: " + punkte); } }`;
     }

     additionalFiles['Test.java'] = // define test annotation
       'import java.lang.annotation.ElementType; import java.lang.annotation.Retention; import java.lang.annotation.RetentionPolicy; import java.lang.annotation.Target; @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) public @interface Test { String name() default "";}';
     additionalFiles['compile'] = // For the Judge0 to know how to compile and execute your multi-file program you need to provide two special files that should be available in the root of the .zip archive that you are sending with additional_files attribute. These files should be named compile and run, and are expected to be Bash scripts that know how to compile and execute your multi-file program.
       '#!/bin/bash\n/usr/local/openjdk13/bin/javac Main.java';
     additionalFiles['run'] = '#!/bin/bash\n/usr/local/openjdk13/bin/java Main'; // adding sqlite-jdbc is possible: /usr/local/openjdk13/bin/java -classpath ".:sqlite-jdbc-3.27.2.1.jar" Main

     const requestBody = await this.generateRequestBody(additionalFiles);
     const submissionResponse = await fetch(this.apiUrl + '/?base64_encoded', {
       method: 'POST',
       body: requestBody,
       headers: { 'Content-Type': 'application/json' },
     });

     if (!submissionResponse.ok) {
       throw new HttpException(
         'Failed to submit the code to Judge0',
         HttpStatus.BAD_GATEWAY,
       );
     }

     const submission = await submissionResponse.json();
     const submissionId = submission.token;
     let resultjudge0Response;
     let result: Judge0Dto;

     do {
       await new Promise((resolve) => setTimeout(resolve, 300)); // Polling delay
       resultjudge0Response = await fetch(
         `${this.apiUrl}/${submissionId}?base64_encoded=true`,
         {
           method: 'GET',
           headers: { 'Content-Type': 'application/json' },
         },
       );

       if (!resultjudge0Response.ok) {
         console.log('Failed to get the code execution result from Judge0');
         throw new HttpException(
           'Failed to get the code execution result from Judge0',
           HttpStatus.BAD_GATEWAY,
         );
       }

       result = await resultjudge0Response.json();
       if (result.stdout) {
         // decode from base64
         result.stdout = Buffer.from(result.stdout, 'base64').toString();
       }
       if (result.stderr) {
         result.stderr = Buffer.from(result.stderr, 'base64').toString();
       }
       if (result.compile_output) {
         result.compile_output = Buffer.from(
           result.compile_output,
           'base64',
         ).toString();
       }
     } while (result.status.id <= 2); // Polling the result until the code is processed

     const user = await this.prisma.user.findUnique({
       where: {
         email: req.user.email,
       },
     });

     let submitCode = '';
     for (const fileName in additionalFiles) {
       submitCode +=
         'Beginn ' +
         fileName +
         '\n' +
         additionalFiles[fileName] +
         '\n Ende ' +
         fileName +
         '\n\n';
     }

     const prismaResult: CodeSubmission = await this.prisma.codeSubmission.create({
       data: {
         code: code,
         compilerOutput: result.stdout,
         compilerError: result.stderr,
         compilerResponse: result.compile_output,
         user: {
           connect: {
             id: user.id,
           },
         },
         codingQuestion: {
           connect: {
             id: taskId,
           },
         },
       },
     });

     // result.compile_output = result.compile_output?.split('Dynamisch.java')[0]; // remove everything from Dynamisch.java so students can't see test cases

     return {
       resultjudge0: result,
       encryptedSubmissionId: this.cryptoService.encrypt(prismaResult.id.toString()),
     };
   }

  /**
   * This belongs to the runMultipleFiles function.
   * Generate request body for additional_files field.
   * @param additionalFiles - An object where each key-value pair represents a file name and its content (code).
   * @return {Promise<string>} Returns a promise that resolves to a JSON-formatted string containing base64-encoded additional_files data.
   */
  async generateRequestBody(additionalFiles: {[fileName: string]: string;}): Promise<string> {
    const zip = new JSZip();
    for (const fileName in additionalFiles) {
      const fileContent = additionalFiles[fileName].replace(/\r\n/g, '\n');
      zip.file(fileName, fileContent);
    }
    const base64Data = await zip.generateAsync({ type: 'base64' });

    return JSON.stringify({
      source_code: '',
      language_id: '89',
      additional_files: base64Data,
    });
  }

  /**
   * This belongs to the runMultipleFiles function.
   * Create a string representation of input arguments for main.java - Needed for tasks that require user input.
   * @param {string[]} inputArgs - An array of input arguments.
   * @return {string} Returns a properly formatted input arguments string for Java main method.
   */
  createInputArgsString(inputArgs: string[]): string {
    let result = '';
    let temp = '';

    if (inputArgs.length > 0) {
      for (let i = 0; i < inputArgs.length; i++) {
        if (i == inputArgs.length - 1) {
          temp += '"' + inputArgs[i] + '"'; // no comma at the end
        } else {
          temp += '"' + inputArgs[i] + '",';
        }
      }
      result = 'new String[] {' + temp + '}';
    } else {
      result = 'new String[0]'; // if no input args are given
    }

    return result;
  }

  /**
   * Get the programming language id by its name.
   * @function
   * @param {string} name - The name of the language (i.e. java, javascript, etc.)
   * @return {number | undefined} Returns the language id or undefined if not found.
   */
  getLanguageIdByName(name: string): number | undefined {
    const language = languages.find(
      (lang) => lang.name.includes(name) && !lang.is_archived,
    );
    return language ? language.id : undefined;
  }
}
