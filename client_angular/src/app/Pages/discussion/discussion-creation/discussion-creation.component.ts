import type { discussionCreationDTO, discussionNodeNamesDTO } from '@DTOs/discussionCreation.dto';
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';

@Component({
  selector: 'app-discussion-creation',
  templateUrl: './discussion-creation.component.html',
  styleUrls: ['./discussion-creation.component.scss'],
})
export class DiscussionCreationComponent {
  //@Input() userId: number = 1;
  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
    max_height: 500,
    resize: false,
  };

  discussionNodeNames: discussionNodeNamesDTO = {
    conceptNodeName: 'dummy',
    contentNodeName: 'dummy',
    contentElementName: 'dummy',
  };

  discussionData: discussionCreationDTO = {
    title: 'dummy',
    text: 'dummy',
    conceptNodeId: -1,
    contentNodeId: -1,
    contentElementId: -1,
  };

  constructor(
    public dialogRef: MatDialogRef<DiscussionCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public reqDiscussionData: discussionCreationDTO,
    private readonly creationService: DiscussionCreationService,
  ) {
    this.discussionData = reqDiscussionData;
    this.creationService
      .getNodeNames(
        reqDiscussionData.conceptNodeId,
        reqDiscussionData.contentNodeId,
        reqDiscussionData.contentElementId,
      )
      .subscribe(data => {
        this.discussionNodeNames = data;
      });
  }

  /**
   * Submits the discussion creation form, awaiting the creation of the discussion and closing the dialog
   * @param title the discussion title
   * @param text the message text
   */
  onSubmit(title: string, text: string) {
    //console.log("Submit: " + title + text);
    if (title != '' && text != '') {
      this.discussionData.title = title;
      this.discussionData.text = text;

      this.creationService.createDiscussion(this.discussionData).subscribe(discussionId => {
        if (isNaN(discussionId)) {
          throw new Error('Discussion not created, discussion id is NaN: ' + discussionId);
        }
        this.dialogRef.close(discussionId);
      });

      /* this.creationService.createAnonymousUser().subscribe(data => {
        if (data.id != -1) {
          this.discussionData.authorId = data.id; //rewrite needed when auth is implemented
          this.creationService.createDiscussion(this.discussionData).subscribe(discussionData => {
            this.discussionData = discussionData;
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
          });
        }
      }); */
    }
  }
}
