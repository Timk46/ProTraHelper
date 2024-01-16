import { discussionCreationDTO, discussionNodeNamesDTO } from '@DTOs/discussionCreation.dto';
import { Component, Inject, Input } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';

@Component({
  selector: 'app-discussion-creation',
  templateUrl: './discussion-creation.component.html',
  styleUrls: ['./discussion-creation.component.scss']
})
export class DiscussionCreationComponent {

  //@Input() userId: number = 1;
  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
    min_height: 300,
    max_height: 500,
    resize: false,
  }

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

  constructor(
    public dialogRef: MatDialogRef<DiscussionCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public reqDiscussionData: discussionCreationDTO,
    private creationService: DiscussionCreationService,
    ) {
      this.discussionData = reqDiscussionData;
      this.creationService.getNodeNames(reqDiscussionData.conceptNodeId, reqDiscussionData.contentNodeId, reqDiscussionData.contentElementId).subscribe(data => {
        this.discussionNodeNames = data;
      });
    }

  /**
   * Submits the discussion creation form by creating an anonymous user, a discussion and a message
   * @param title
   * @param text
   *
   * This function does:
   * 1. Checks if the title and text are not empty
   * 2. Creates a random name for the anonymous user
   * 3. Creates an anonymous user with the given id and name
   * 4. Creates a discussion with the given title and the id of the anonymous user
   * 5. Creates a message with the given text and the id of the discussion
   * 6. Navigates to the discussion page
   *
   */
  onSubmit(title: string, text: string) {
    console.log("Submit: " + title + text);
    if (title != "" && text != "") {
      this.discussionData.title = title;

      this.creationService.createAnonymousUser().subscribe(data => {
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
      });
    }
  }
}
