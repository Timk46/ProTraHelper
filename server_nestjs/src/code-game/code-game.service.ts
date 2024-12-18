import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import { CppProjectExecutionResult } from '@DTOs/codeGame.dto';

@Injectable()
export class CodeGameService {
  constructor(private readonly prismaService: PrismaService) {}

  // private readonly apiUrl =
  'https://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/';
  private readonly apiUrl =
    'http://jury1.bshefl2.bs.informatik.uni-siegen.de/execute/';

  async findOne(id: number): Promise<detailedQuestionDTO> {
    const question = await this.prismaService.question.findUnique({
      where: { id },
      include: {
        codeGameQuestion: {
          include: {
            codeGameScaffolds: true,
          },
        },
      },
    });

    if (!question) {
      console.log(`ERROR: Question with ID ${id} not found`);
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    if (!question.codeGameQuestion) {
      console.log(`ERROR: Question with ID ${id} is not a coding question`);
      throw new BadRequestException(
        `Question with ID ${id} is not a coding question`,
      );
    }

    return question;
  }

  async executeCodeGameTask(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
    gameFile: { [fileName: string]: string },
  ) {
    additionalFiles = {
      ...additionalFiles,
      ...gameFile,
    };

    return await this.executeCppProject(mainFile, additionalFiles);
  }

  async executeCppProject(
    mainFile: { [fileName: string]: string },
    additionalFiles: { [fileName: string]: string },
  ) {
    const mainFileBase64 = await this.generateBase64(mainFile);
    const additionalFilesBase64 = await this.generateBase64(additionalFiles);

    console.log('JURY 1 CPP Project execution');
    console.log(
      JSON.stringify({
        mainFile: mainFileBase64,
        additionalFiles: additionalFilesBase64,
      }),
    );

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
        throw new HttpException(
          `Failed to execute C++ code. Status: ${response.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const responseBody: CppProjectExecutionResult = await response.json();
      console.log('JURY 1 CPP Project execution response:', responseBody);

      return responseBody;
    } catch (error) {
      console.error('Fetch error:', error);
      throw new HttpException(
        'Failed to execute C++ code due to a network error.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
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
}
