import { discussionCreationDTO, discussionNodeNamesDTO } from '@DTOs/discussionCreation.dto';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CreationService } from 'src/app/Services/discussion/creation.service';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';

@Component({
  selector: 'app-discussion-creation',
  templateUrl: './discussion-creation.component.html',
  styleUrls: ['./discussion-creation.component.scss']
})
export class DiscussionCreationComponent {

  @Input() userId: number = 1;

  discussionNodeNames: discussionNodeNamesDTO = {
    conceptNodeName: "dummy",
    contentNodeName: "dummy",
    contentElementName: "dummy"
  };

  discussionData: discussionCreationDTO = {
    id: -1,
    title: "dummy",
    conceptNodeId: -1,
    contentNodeId: -1,
    contentElementId: -1,
    authorId: -1,
    isSolved: false
  };

  constructor(route: ActivatedRoute, private discussionDataService: DiscussionDataService, private creationService: CreationService) {
    route.params.subscribe(params => {
      console.log('got params');
      this.discussionData.conceptNodeId = Number(params['conceptNodeId']) || -1;
      this.discussionData.contentNodeId = Number(params['contentNodeId']) || -1;
      this.discussionData.contentElementId = Number(params['contentElementId']) || -1;
      console.log(this.discussionData);
      discussionDataService.getNodeNames(this.discussionData.conceptNodeId, this.discussionData.contentNodeId, this.discussionData.contentElementId).subscribe(data => {
        this.discussionNodeNames = data;
      });
    });
  }

  onSubmit(title: string, text: string) {
    console.log("Submit: " + title + text);
    if (title != "" && text != "" && this.userId != -1 && this.discussionData.id == -1) {
      this.discussionData.title = title;
      this.creationService.createAnonymousUser(this.userId, "dummy").subscribe(data => {
        this.discussionData.authorId = data.id;
        console.log(data);

        this.creationService.createDiscussion(this.discussionData).subscribe(data => {
         this.discussionData = data;
         if (data.id != -1) {
            this.creationService.createDiscussionMessage({
              id: -1,
              text: text,
              authorId: data.authorId,
              discussionId: data.id,
              isInitiator: true,
              isSolution: false
            }).subscribe(data => {
              console.log(data);
            });
          }

        });
      });
    }

  }

}
