import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';
import type { QuestionDTO } from '@Interfaces/index';
import { LinkableContentElementDTO, LinkableContentNodeDTO } from '@Interfaces/index';
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

  @roles('ADMIN')
  @Get('/unlinkContentElement/:contentElementId')
  /**
   * Unlinks a content element by its ID.
   *
   * @param contentElementId - The ID of the content element to unlink.
   * @returns A promise that resolves to a boolean indicating whether the unlinking was successful.
   */
  async unlinkContentElement(
    @Param('contentElementId') contentElementId: string,
  ): Promise<boolean> {
    return this.contentLinkerService.unlinkContentElement(Number(contentElementId));
  }

  @roles('ADMIN')
  @Get('unlinkedQuestions')
  /**
   * Retrieves a list of questions that are not linked to any content.
   *
   * @returns {Promise<QuestionDTO[]>} A promise that resolves to an array of QuestionDTO objects representing the unlinked questions.
   */
  async getUnlinkedQuestions(): Promise<QuestionDTO[]> {
    return this.contentLinkerService.getUnlinkedQuestions();
  }
}
