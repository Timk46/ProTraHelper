import { Controller, Get, Param } from '@nestjs/common';
import { DiscussionViewService } from './discussion-view.service';
import { discussionMessageDTO, nodeNameDTO } from '@DTOs/index';

const debug: boolean = true; // set this to false to disable console logs

@Controller('discussion/view')
export class DiscussionViewController {

  constructor(private viewService: DiscussionViewService) { }

  /** Returns the name of the concept node for a given discussion
   *
   * @param discussionId
   * @returns the name of the concept node
   */
  @Get('conceptNodeName/:discussionId')
  async getConceptNodeName(@Param('discussionId') discussionId: number): Promise<nodeNameDTO> {
    debug && console.log('DiscussionViewController: getConceptNodeName')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getConceptNodeName(Number(discussionId));
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId
   * @returns the discussion
   */
  @Get(':discussionId')
  async getDiscussion(@Param('discussionId') discussionId: number) {
    debug && console.log('DiscussionViewController: getDiscussion')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getDiscussion(Number(discussionId));
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId
   * @returns the messages
   */
  @Get('messages/:discussionId')
  async getMessages(@Param('discussionId') discussionId: number): Promise<discussionMessageDTO[]> {
    debug && console.log('DiscussionViewController: getMessages')
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getDiscussionMessages(Number(discussionId));
  }



}
