import { PrismaService } from '@/prisma/prisma.service';
import type {
  discussionDTO,
  discussionFilterContentNodeDTO,
  discussionFilterDTO,
} from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { DiscussionDataService } from '../discussion-data/discussion-data.service';

@Injectable()
export class DiscussionListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: DiscussionDataService,
  ) {}

  /**
   * This function returns all discussions for a given concept node and optional content node, author, solved status and search string
   * provided in the discussionFilterDTO
   *
   * @param filterData : discussionFilterDTO
   * @returns  the discussions
   *
   * How it works:
   * 1. Get all discussions for the given concept node:
   *   - find all discussions and look inside their connected concept nodes
   *   - find all trains that are connected to the content nodes of the concept node
   *   - from this trains, filter the ones that are only connected to the given filterData concept node
   *   - keep only the discussions that do not have a content node or that have a content node that is trained by the filter concept node
   * 2. Filter the discussions according to the given filter data
   * 3. Build the discussionsDTO and return it
   *
   */
  async getDiscussions(filterData: discussionFilterDTO): Promise<discussionDTO[]> {
    let discussions = await this.prisma.discussion.findMany({
      where: {
        conceptNode: {
          trainedBy: {
            some: {
              contentNode: {
                trains: {
                  some: {
                    conceptNode: {
                      id: Number(filterData.conceptNodeId),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    //we have to get a list of all content nodes that are trained by the filter concept node
    const trainedByContentNodes = await this.prisma.training.findMany({
      where: {
        conceptNodeId: Number(filterData.conceptNodeId),
      },
      select: {
        contentNodeId: true,
      },
    });

    if (!discussions) {
      throw new Error('Discussions not found');
    }

    //filter only discussions that do not have a content node or that have a content node that is trained by the filter concept node
    discussions = discussions.filter(
      discussion =>
        discussion.contentNodeId == null ||
        trainedByContentNodes.some(
          trainedByContentNode => trainedByContentNode.contentNodeId == discussion.contentNodeId,
        ),
    );

    if (filterData.contentNodeId != -1) {
      //console.log('filtering for contentNodeId');
      discussions = discussions.filter(
        discussion =>
          discussion.contentNodeId === filterData.contentNodeId ||
          discussion.contentNodeId === null,
      );
    }
    if (filterData.onlySolved == true) {
      //console.log('filtering for onlySolved');
      discussions = discussions.filter(discussion => discussion.isSolved);
    }
    if (filterData.authorId != -1) {
      //console.log('filtering for authorId');
      discussions = discussions.filter(discussion => discussion.authorId == filterData.authorId);
    }

    if (filterData.searchString != '') {
      //console.log('filtering for searchString');
      discussions = discussions.filter(discussion =>
        discussion.title.includes(filterData.searchString),
      );
    }

    const returnData: discussionDTO[] = [];

    for (const discussion of discussions) {
      returnData.push({
        id: discussion.id,
        initMessageId: await this.dataService.getInitMessageId(discussion.id),
        title: discussion.title,
        authorName: await this.dataService.getAuthorName(discussion.authorId),
        createdAt: discussion.createdAt,
        contentNodeName:
          discussion.contentNodeId == null
            ? 'allgemein'
            : (await this.dataService.getContentNodeName(discussion.contentNodeId)).name,
        commentCount: await this.dataService.getDiscussionCommentCount(discussion.id),
        isSolved: discussion.isSolved,
      });
    }

    return returnData;
  }

  /**
   * Returns the content nodes that are trained by the given concept node - used for the discussion filter
   * @param conceptNodeId
   * @returns discussionFilterContentNodeDTO[]
   */
  async getFilterContentNodes(conceptNodeId: number): Promise<discussionFilterContentNodeDTO[]> {
    const contentNodes = await this.prisma.training.findMany({
      where: {
        conceptNodeId: conceptNodeId,
      },
      select: {
        contentNode: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        awards: true,
      },
    });

    if (!contentNodes) {
      throw new Error('Content nodes not found');
    }

    return contentNodes.map(contentNode => {
      return {
        id: contentNode.contentNode.id,
        name: contentNode.contentNode.name,
        description: contentNode.contentNode.description,
        awards: contentNode.awards,
      };
    });
  }
}
