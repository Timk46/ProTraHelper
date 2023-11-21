import { discussionCreationDTO, discussionNodeNamesDTO } from '@DTOs/index';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';

@Component({
  selector: 'app-discussion-creation-dialog',
  templateUrl: './discussion-creation-dialog.component.html',
  styleUrls: ['./discussion-creation-dialog.component.scss']
})
export class DiscussionCreationDialogComponent {
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

  constructor(
    public dialogRef: MatDialogRef<DiscussionCreationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public reqDiscussionData: discussionCreationDTO,
    private discussionDataService: DiscussionDataService,
    private creationService: DiscussionCreationService,
    ) {
      this.discussionData = reqDiscussionData;
      this.discussionDataService.getNodeNames(reqDiscussionData.conceptNodeId, reqDiscussionData.contentNodeId, reqDiscussionData.contentElementId).subscribe(data => {
        this.discussionNodeNames = data;
      });
    }

  /**
   * Submits the discussion creation form by creating an anonymous user, a discussion and a message, then closes the dialog
   * @param title
   * @param text
   */
  onSubmit(title: string, text: string) {
    console.log("Submit: " + title + text);
    if (title != "" && text != "" && this.discussionData.authorId != -1) {
      this.discussionData.title = title;
      const randomSurname = this.funnyWords[Math.floor(Math.random() * this.funnyWords.length)];
      const randomName = this.funnyWords[Math.floor(Math.random() * this.funnyWords.length)];

      this.creationService.createAnonymousUser(this.discussionData.authorId, (randomSurname + "s " + randomName)).subscribe(data => {
        this.discussionData.authorId = data.id; //rewrite needed when auth is implemented

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
            }).subscribe( () => {
              this.dialogRef.close(this.discussionData.id);
            });
          }
        });

      });
    }
  }


}
