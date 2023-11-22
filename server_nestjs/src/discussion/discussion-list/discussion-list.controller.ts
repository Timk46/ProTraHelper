import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiscussionListService } from './discussion-list.service';
import { discussionDTO, discussionFilterContentNodeDTO, discussionFilterDTO } from '@DTOs/index';

const debug: boolean = true; // set this to false to disable console logs

@Controller('discussion/list')
export class DiscussionListController {

  constructor(private listService: DiscussionListService) { }

  /**
  * This function returns all discussions for a given concept node. All parameters are required,
  * though besides the conceptNodeId they can be -1 or false to indicate that they should not be considered.
  *
  * @param conceptNodeId the concept node id
  * @param contentNodeId the content node id - if -1, all content nodes are considered
  * @param onlySolved whether to only return solved discussions
  * @param authorId the author id - if -1, all authors are considered
  * @param searchString the search string, handled as JSON string with a 'content' field
  * @returns the discussions
  */
  @Post()
  async getDiscussions(@Body() filterData: discussionFilterDTO): Promise<discussionDTO[]> {
    debug && console.log('DiscussionListController: getDiscussions');
    return this.listService.getDiscussions(filterData);
  }

  @Get('filterContentNodes/:conceptNodeId')
  async getFilterContentNodes(@Param('conceptNodeId') conceptNodeId: number): Promise<discussionFilterContentNodeDTO[]> {
    debug && console.log('DiscussionListController: getFilterContentNodes');
    if (isNaN(conceptNodeId)) {
      throw new Error('Invalid concept node id');
    }
    return this.listService.getFilterContentNodes(Number(conceptNodeId));
  }

}
