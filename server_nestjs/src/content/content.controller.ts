import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentDTO } from '@Interfaces/index';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

    /**
   * Get Content by Concept Node ID
   * @route GET /content/byConceptNode/:conceptNodeId
   *
   * @param {number} conceptNodeId - The ID of the concept node passed as a URL parameter.
   *
   * @returns {Promise<ContentDTO[]>} - A promise that resolves to an array of ContentDTO objects.
   *
   * @example http://localhost:3000/content/byConceptNode/14
   */
  @Get('/byConceptNode/:conceptNodeId')
  async getContentByConceptNode(
    @Param('conceptNodeId') conceptNodeId: number
  ): Promise<ContentDTO[]> {
    return this.contentService.getContentByConceptNode(conceptNodeId);
  }
}
