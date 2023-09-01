import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentDTO, ContentsForConceptDTO } from '@Interfaces/index';

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
  @Get('/byConceptNode/:conceptNodeId')
  async getContentByConceptNode(
    @Param('conceptNodeId') conceptNodeId: number
  ): Promise<ContentsForConceptDTO> {
    return this.contentService.getContentsByConceptNode(conceptNodeId);
  }
}
