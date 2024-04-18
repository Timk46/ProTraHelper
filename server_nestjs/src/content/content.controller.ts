/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Req, UseGuards} from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentsForConceptDTO } from '@Interfaces/index';
import { ContentElementStatusDTO } from '@DTOs/index';
import { RolesGuard, roles } from '@/auth/roles.guard';

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
    @Req() req,
  ): Promise<ContentsForConceptDTO> {
    return this.contentService.getContentsByConceptNode(conceptNodeId, req.user.id);
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
    if (isNaN(contentElementId) || isNaN(req.user.id)) {
      throw new Error('Invalid contentElement id or user id');
    }
    return this.contentService.getContentElementStatus(
      Number(contentElementId),
      Number(req.user.id),
    );
  }

  /**
   * Toggle Content Element Status by Content Element ID
   * @route GET /content/toggleCheckmark/:contentElementId
   *
   * @param {number} contentElementId - The ID of the content element passed as a URL parameter.
   *
   * @returns {Promise<boolean>} - A promise that resolves to a boolean.
   *
   * @example http://localhost:3000/content/toggleCheckmark/14
   */
  @roles('ANY')
  @Get('/toggleCheckmark/:contentElementId/:conceptNodeId/:level')
  async toggleContentElementStatus(
    @Param('contentElementId') contentElementId: number,
    @Param('conceptNodeId') conceptNodeId: number,
    @Param('level') level: number,
    @Req() req,
  ): Promise<boolean> {
    if (isNaN(contentElementId)) {
      throw new Error('Invalid contentElement id');
    }
    return this.contentService.toggleCheckmark(
      Number(contentElementId),
      req.user.id,
    );
  }

  /**
   * Toggle Content Element Status by Content Element ID
   * @route GET /content/toggleQuestionmark/:contentElementId
   *
   * @param {number} contentElementId - The ID of the content element passed as a URL parameter.
   *
   * @returns {Promise<boolean>} - A promise that resolves to a boolean.
   *
   * @example http://localhost:3000/content/toggleQuestionmark/14
   */
  @roles('ANY')
  @Get('/toggleQuestionmark/:contentElementId')
  async toggleContentElementQuestionStatus(
    @Param('contentElementId') contentElementId: number,
    @Req() req,
  ): Promise<boolean> {
    if (isNaN(contentElementId)) {
      throw new Error('Invalid contentElement id');
    }
    return this.contentService.toggleQuestionmark(
      Number(contentElementId),
      req.user.id,
    );
  }

  /**
   * Update Last Opened Date
   * @route GET /content/updateLastOpenedDate/:contentNodeId
   *
   * @param {number} contentNodeId - The ID of the content node passed as a URL parameter.
   *
   * @returns {Promise<Date>} - A promise that resolves to a Date.
   *
   * @example http://localhost:3000/content/updateLastOpenedDate/14
   */
  @roles('ANY')
  @Get('/lastOpenedDate/:contentNodeId')
  async updateLastOpenedDate(
    @Param('contentNodeId') contentNodeId: number,
    @Req() req,
  ): Promise<Date> {
    console.log('ContentController: updateLastOpenedDate');
    if (isNaN(contentNodeId)) {
      throw new Error('Invalid contentNode id');
    }
    return this.contentService.updateLastOpenedDate(
      Number(contentNodeId),
      req.user.id,
    );
  }

  @roles('ANY')
  @Get('/concepts')
  async fetchAllConceptNames(): Promise<string[]> {
    const concepts = await this.contentService.fetchAllConceptNames();
    const formattedConcepts = concepts.map(concept => {
      const formattedConcept = concept.replace(/^\d+\s/, '');
      return formattedConcept.charAt(0).toUpperCase() + formattedConcept.slice(1);
    });
    return formattedConcepts
  }
}
