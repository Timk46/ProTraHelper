import { Body, Controller, Get, Param, Post, Req, UseGuards} from '@nestjs/common';
import { RolesGuard, roles } from '@/auth/roles.guard';
import { LinkableContentElementDTO, LinkableContentNodeDTO, QuestionDTO } from '@Interfaces/index';
import { ContentLinkerService } from './content-linker.service';

@UseGuards(RolesGuard)
@Controller('content/linker')

export class ContentLinkerController {

  constructor(private readonly contentLinkerService: ContentLinkerService) {}

  @roles('ADMIN')
  @Post('/createLinkedContentNode')
  /**
   * Creates a linked content node.
   *
   * @param linkableContentNode - The linkable content node to create.
   * @param req - The request object.
   * @returns A promise that resolves to the created linkable content node.
   */
  async createLinkedContentNode(
    @Body() linkableContentNode: LinkableContentNodeDTO,
    @Req() req,
  ): Promise<LinkableContentNodeDTO> {
    return this.contentLinkerService.createLinkedContentNode(linkableContentNode);
  }

  @roles('ADMIN')
  @Post('/createLinkedContentElement')
  /**
   * Creates a linked question.
   *
   * @param linkableQuestion - The linkable question DTO.
   * @param req - The request object.
   * @returns A promise that resolves to a QuestionDTO.
   */
  async createLinkedContentElement(
    @Body() linkableQuestion: LinkableContentElementDTO,
    @Req() req,
  ): Promise<LinkableContentElementDTO> {
    return this.contentLinkerService.createLinkedContentElement(linkableQuestion, req.user.id);
  }


}
