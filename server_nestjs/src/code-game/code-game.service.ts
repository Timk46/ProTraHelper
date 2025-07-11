import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import type {
  CppProjectExecutionResult,
  JavaProjectExecutionResult,
  PythonProjectExecutionResult,
} from '@DTOs/codeGame.dto';
import { questionType } from '@DTOs/question.dto';

@Injectable()
export class CodeGameService {
  constructor(private readonly prismaService: PrismaService) {}

  private readonly apiUrl: string = 'http://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/';

  async findOne(id: number): Promise<detailedQuestionDTO> {
    const question = await this.prismaService.question.findUnique({
      where: { id },
      include: {
        codeGameQuestion: {
          include: {
            codeGameScaffolds: true,
          },
        },
        contentElement: true,
      },
    });

    if (!question) {
      console.log(`ERROR: Question with ID ${id} not found`);
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (!question.codeGameQuestion) {
      console.log(`ERROR: Question with ID ${id} is not a coding question`);
      throw new BadRequestException(`Question with ID ${id} is not a coding question`);
    }

    /* contentElementId passed in codeGameQuestion */
    const contentElementId = question.contentElement.id;

    const {
      contentElement,
      codeGameQuestion,
      ...questionWithoutContentElementAndCodeGameQuestion
    } = question;

    const codeGameQuestionWithContentElementId = {
      ...codeGameQuestion,
      contentElementId: contentElement.id,
    };

    return {
      ...questionWithoutContentElementAndCodeGameQuestion,
      type: questionType.CODEGAME,
      codeGameQuestion: codeGameQuestionWithContentElementId,
    };
  }

  async executeCodeGameTask(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
    gameFile: { [fileName: string]: string },
    language: string,
  ) {
    additionalFiles = {
      ...additionalFiles,
      ...gameFile,
    };

    if (language === 'cpp') {
      return this.executeCppProject(mainFile, additionalFiles);
    } else if (language === 'python') {
      return this.executePythonProject(mainFile, additionalFiles);
    } else if (language === 'java') {
      return this.executeJavaProject(mainFile, additionalFiles);
    } else {
      throw new BadRequestException(`Unsupported language for code game task: ${language}`);
    }
  }

  async executeCppProject(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
  ) {
    const mainFileBase64 = await this.generateBase64(mainFile);
    const additionalFilesBase64 = await this.generateBase64(additionalFiles);

    console.log('JURY 1 CPP Project execution');
    // console.log(
    //   JSON.stringify({
    //     mainFile: mainFileBase64,
    //     additionalFiles: additionalFilesBase64,
    //   }),
    // );

    try {
      const response = await fetch(`${this.apiUrl}cpp-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainFile: mainFileBase64,
          additionalFiles: additionalFilesBase64,
        }),
      });

      if (!response.ok) {
        console.log(`Failed to execute C++ code. Status: ${response.status}`);
        return null;

        // throw new HttpException(
        //   `Failed to execute C++ code. Status: ${response.status}`,
        //   HttpStatus.BAD_GATEWAY,
        // );
      }

      const responseBody: CppProjectExecutionResult = await response.json();
      console.log('JURY 1 CPP Project execution response:', responseBody);

      return responseBody;
    } catch (error) {
      console.log('Fetch error:', error);
      return null;

      // throw new HttpException(
      //   'Failed to execute C++ code due to a network error.',
      //   HttpStatus.SERVICE_UNAVAILABLE,
      // );
    }
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

  async executePythonProject(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
  ) {
    const mainFileBase64 = await this.generateBase64(mainFile);
    const additionalFilesBase64 = await this.generateBase64(additionalFiles);

    console.log('JURY 1 Python Project execution');
    // console.log(
    //   JSON.stringify({
    //     runMethod: 'main',
    //     mainFile: mainFileBase64,
    //     additionalFiles: additionalFilesBase64,
    //   }),
    // );

    try {
      const response = await fetch(`${this.apiUrl}python-project?shouldOutputBase64=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runMethod: 'main',
          mainFile: mainFileBase64,
          additionalFiles: additionalFilesBase64,
        }),
      });

      if (!response.ok) {
        console.log(`Failed to execute python code. Status: ${response.status}`);
        return null;

        // throw new HttpException(
        //   `Failed to execute python code. Status: ${response.status}`,
        //   HttpStatus.BAD_GATEWAY,
        // );
      }

      const responseBody: PythonProjectExecutionResult = await response.json();
      console.log('JURY 1 Python Project execution response:', responseBody);

      return responseBody;
    } catch (error) {
      console.log('Fetch error:', error);
      return null;

      // throw new HttpException(
      //   'Failed to execute Python code due to a network error.',
      //   HttpStatus.SERVICE_UNAVAILABLE,
      // );
    }
  }

  async executeJavaProject(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
  ) {
    const mainFileBase64 = await this.generateBase64(mainFile);
    const additionalFilesBase64 = await this.generateBase64(additionalFiles);

    const files = {
      ...mainFileBase64,
      ...additionalFilesBase64,
    };

    console.log('JURY 1 Java Project execution');
    // console.log(
    //   JSON.stringify({
    //     mainClassName: 'game.Main',
    //     files: files,
    //   }),
    // );

    try {
      const response = await fetch(`${this.apiUrl}java-project?shouldOutputBase64=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainClassName: 'game.Main',
          files: files,
        }),
      });

      if (!response.ok) {
        console.log(`Failed to execute java code. Status: ${response.status}`);
        return null;

        // throw new HttpException(
        //   `Failed to execute java code. Status: ${response.status}`,
        //   HttpStatus.BAD_GATEWAY,
        // );
      }

      const responseBody: JavaProjectExecutionResult = await response.json();
      console.log('JURY 1 Java Project execution response:', responseBody);

      return responseBody;
    } catch (error) {
      console.log('Fetch error:', error);
      return null;

      // throw new HttpException(
      //   'Failed to execute Java code due to a network error.',
      //   HttpStatus.SERVICE_UNAVAILABLE,
      // );
    }
  }
}
