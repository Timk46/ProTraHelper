import { discussionCreationDTO, discussionNodeNamesDTO } from '@DTOs/discussionCreation.dto';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

  funnyWords: string[] = ["Narwal", "Quokka", "Axolotl", "Blobfisch", "Pangolin", "Wombat", "Kakapo", "Fuchskusu", "Gibbon", "Tapir", "Schnabeltier", "Alpaka", "Koala", "Lemming", "Marmelade", "Muffin", "Pudding", "Schokolade", "Zimtstern", "Donut", "Einhorn", "Flamingo", "Giraffe", "Hummel", "Igel", "Jaguar", "Kolibri", "Lama", "Maulwurf", "Nashorn", "Otter", "Pinguin", "Qualle", "Raubkatze", "Seestern", "Tukan", "Uhu", "Vogelspinne", "Yak", "Zebra"]

  constructor(route: ActivatedRoute, private discussionDataService: DiscussionDataService, private creationService: CreationService, private router: Router) {
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
      const randomSurname = this.funnyWords[Math.floor(Math.random() * this.funnyWords.length)];
      const randomName = this.funnyWords[Math.floor(Math.random() * this.funnyWords.length)];
      this.creationService.createAnonymousUser(this.userId, (randomSurname + "s " + randomName)).subscribe(data => {
        this.discussionData.authorId = data.id;

        this.creationService.createDiscussion(this.discussionData).subscribe(discussionData => {
         this.discussionData = discussionData;
         if (data.id != -1) {
            this.creationService.createDiscussionMessage({
              id: -1,
              text: text,
              authorId: discussionData.authorId,
              discussionId: discussionData.id,
              isInitiator: true,
              isSolution: false
            }).subscribe(messageData => {
              this.router.navigate(['/discussion-page/' + discussionData.id]);
            });
          }

        });
      });
    }
  }

}
