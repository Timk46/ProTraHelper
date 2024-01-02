import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentDTO, ContentsForConceptDTO } from '@Interfaces/index';
import { ContentElementStatusDTO } from '@DTOs/index';
import { RolesGuard, roles } from '@/auth/roles.guard';

const debug = true;
@UseGuards(RolesGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Get Content by Concept Node ID
   * @route GET /content/byConceptNode/:conceptNodeId
   *
   * @param {number} conceptNodeId - The ID of the concept node passed as a URL parameter.
   *
   * @returns {Promise<ContentsForConceptDTO>} - A promise that resolves to ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   *
   * @example http://localhost:3000/content/byConceptNode/14
   */
  @roles('ANY')
  @Get('/byConceptNode/:conceptNodeId')
  async getContentByConceptNode(
    @Param('conceptNodeId') conceptNodeId: number,
  ): Promise<ContentsForConceptDTO> {
    return this.contentService.getContentsByConceptNode(conceptNodeId);
  }

  /**
   * Get Content Element Status by Content Element ID
   * @route GET /content/status/:contentElementId
   *
   * @param {number} contentElementId - The ID of the content element passed as a URL parameter.
   *
   * @returns {Promise<ContentElementStatusDTO>} - A promise that resolves to a ContentElementStatusDTO object.
   *
   * @example http://localhost:3000/content/status/14
   */
  @roles('ANY')
  @Get('/status/:contentElementId')
  async getContentElementStatus(
    @Param('contentElementId') contentElementId: number,
    @Req() req,
  ): Promise<ContentElementStatusDTO> {
    debug && console.log('ContentController: getContentElementStatus');
    if (isNaN(contentElementId) || isNaN(req.user.id)) {
      throw new Error('Invalid contentElement id or user id');
    }
    return this.contentService.getContentElementStatus(
      Number(contentElementId),
      Number(req.user.id),
    );
  }
}
