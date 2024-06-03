import { Controller, Post, Body } from '@nestjs/common';
import { CompareService } from './compare.service';
import { editorDataDTO } from '@DTOs/index';

@Controller('compare')
export class CompareController {

    constructor(private readonly compareService: CompareService) { }

    // @Post('compare')
    // async compare(@Body() solution: editorDataDTO,@Body() attempt: editorDataDTO ): Promise<editorDataDTO> {
    //   console.log('START solution');
    //   console.log(JSON.stringify(solution));
    //   console.log('START attempt');
    //   console.log(JSON.stringify(attempt));
    //     return this.compareService.compare(solution, attempt);
    // }

    @Post('compare')
    async compare(@Body('solutionData') solution: editorDataDTO, @Body('attemptData') attempt: editorDataDTO ): Promise<editorDataDTO> {
      return this.compareService.compare(solution, attempt);
  }


}
