import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';
import { ContentDTO, QuestionDTO, ContentElementDTO } from '@Interfaces/index';
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

  @roles('ADMIN')
  @Get('/unlinkContentNode/:conceptNodeId/:contentNodeId')
  /**
   * Unlinks a content node from a concept node.
   * @param conceptNodeId - The ID of the concept node to unlink from.
   * @param contentNodeId - The ID of the content node to unlink.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the unlinking was successful.
   */
  async unlinkContentNode(
    @Param('conceptNodeId') conceptNodeId: string,
    @Param('contentNodeId') contentNodeId: string,
  ): Promise<boolean> {
    return this.contentLinkerService.unlinkContentNode(
      Number(conceptNodeId),
      Number(contentNodeId),
    );
  }

  @roles('ADMIN')
  @Get('/unlinkedContentNodes')
  /**
   * Retrieves a list of content nodes that are not linked to any concept.
   * @returns {Promise<ContentDTO[]>} A promise that resolves to an array of ContentDTO objects representing the unlinked content nodes.
   */
  async getUnlinkedContentNodes(): Promise<LinkableContentNodeDTO[]> {
    return this.contentLinkerService.getUnlinkedContentNodes();
  }

  @roles('ADMIN')
  @Post('/createContentAttachment/:contentNodeId/:fileId')
  /**
   * Creates a new content attachment by associating a file with a content element and linking it to a content node.
   *
   * @param contentNodeId - The ID of the content node to which the content element will be attached.
   * @param fileId - The ID of the file to be attached to the content element.
   * @param contentElement - The data transfer object representing the content element to be created.
   * @returns A promise that resolves to `true` if the attachment was created successfully, or `false` if the operation failed.
   */
  async createContentAttachment(
    @Param('contentNodeId') contentNodeId: string,
    @Param('fileId') fileId: string,
    @Body() contentElement: ContentElementDTO,
  ): Promise<boolean> {
    return this.contentLinkerService.createContentAttachment(
      Number(contentNodeId),
      contentElement,
      Number(fileId),
    );
  }

  @roles('ADMIN')
  @Get('/contentAttachments/:contentNodeId')
  /**
   * Retrieves all content attachments for a given content node, excluding elements of type QUESTION.
   *
   * @param contentNodeId - The ID of the content node for which attachments should be retrieved.
   * @returns A promise that resolves to an array of ContentElementDTO objects representing the attachments.
   */
  async getContentAttachments(
    @Param('contentNodeId') contentNodeId: string,
  ): Promise<ContentElementDTO[]> {
    return this.contentLinkerService.getContentAttachments(Number(contentNodeId));
  }

  @roles('ADMIN')
  @Post('/linkContentAttachment/:contentNodeId/:contentElementId')
  /**
   * Attempts to link a content element as an attachment to a content node.
   *
   * @param contentNodeId - The ID of the content node to link the attachment to.
   * @param contentElementId - The ID of the content element to be linked as an attachment.
   * @returns A promise that resolves to `true` if the link was created, or `false` if it already existed.
   */
  async linkContentAttachment(
    @Param('contentNodeId') contentNodeId: string,
    @Param('contentElementId') contentElementId: string,
  ): Promise<boolean> {
    return this.contentLinkerService.linkContentAttachment(
      Number(contentNodeId),
      Number(contentElementId),
    );
  }

  @roles('ADMIN')
  @Get('/unlinkContentAttachment/:contentNodeId/:contentElementId')
  /**
   * Unlinks an attachment from a content node by deleting the corresponding content view.
   *
   * @param contentNodeId - The ID of the content node to unlink the attachment from.
   * @param contentElementId - The ID of the content element to be unlinked.
   * @returns A promise that resolves to `true` if the unlinking was successful, or `false` if no matching entry was found.
   */
  async unlinkContentAttachment(
    @Param('contentNodeId') contentNodeId: string,
    @Param('contentElementId') contentElementId: string,
  ): Promise<boolean> {
    return this.contentLinkerService.unlinkContentAttachment(
      Number(contentNodeId),
      Number(contentElementId),
    );
  }

  @roles('ADMIN')
  @Get('/unlinkedAttachments')
  /**
   * Retrieves all content elements that are not linked to any content view.
   *
   * @returns A promise that resolves to an array of unlinked content element DTOs.
   */
  async getUnlinkedAttachments(): Promise<ContentElementDTO[]> {
    return this.contentLinkerService.getUnlinkedAttachments();
  }
}
