import { AnonymousUserDTO, discussionMessageCreationDTO } from '@DTOs/index';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TinymceComponent } from 'src/app/Pages/tinymce/tinymce.component';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';

@Component({
  selector: 'app-discussion-view-create',
  templateUrl: './discussion-view-create.component.html',
  styleUrls: ['./discussion-view-create.component.scss']
})
export class DiscussionViewCreateComponent {

  expanded: Boolean = false
  expanderTitle: String = 'Dem Beitrag antworten'

  editorConfig = { // for later
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | image | codesample',
    min_height: 300,
  }

  anonymousUser: AnonymousUserDTO = {
    id: -1,
    userId: -1,
    anonymousName: 'dummy'
  }

  //@Input() userId: number = -1;
  @Input() discussionId: number = -1;

  @Output() refreshMessages = new EventEmitter<void>();



  constructor(private creationService: DiscussionCreationService) { }

  /** Handles the submission of the comment
   * No empty comments are allowed.
   * Tries to check if the comment author has aleady commented on this discussion.
   * If not, a new anonymous user is created for this comment author in this discussion.
   * Finally it wraps the comment in a messageDTO and sends it to the backend.
   *
   * @param text the text of the comment
   */
  onSubmit(editor: TinymceComponent) {
    const text = editor.getContent();
    // empty text is not allowed
    if (text && text != '') {
      // check if the discussion id is present
      if (this.discussionId != -1) {
        this.creationService.getAnonymousUser(this.discussionId).subscribe(anonymousUser => {
          //console.log(anonymousUser);
          // check if user has answered so far
          if (anonymousUser.id != -1){
            this.anonymousUser = anonymousUser;

            // wrap the comment in a messageDTO and send it to the backend
            const message: discussionMessageCreationDTO = {
              id: -1,
              text: text,
              authorId: this.anonymousUser.id,
              discussionId: this.discussionId,
              isInitiator: false,
              isSolution: false
            }
            this.creationService.createDiscussionMessage(message).subscribe(creationResult => {
              //console.log(creationResult);
              this.expanded = false;
              // refresh the messages by telling the parent 'discussion-page' component to do so
              this.refreshMessages.emit();
              editor.setContent('');
            });

            // if no anonymous user was found
          } else {
            this.creationService.createAnonymousUser().subscribe(creationResult => {
              //console.log(creationResult);
              this.anonymousUser = creationResult;

              // wrap the comment in a messageDTO and send it to the backend
              const message: discussionMessageCreationDTO = {
                id: -1,
                text: text,
                authorId: this.anonymousUser.id,
                discussionId: this.discussionId,
                isInitiator: false,
                isSolution: false
              }
              this.creationService.createDiscussionMessage(message).subscribe(creationResult => {
                //console.log(creationResult);
                this.expanded = false;
                // refresh the messages by telling the parent 'discussion-page' component to do so
                this.refreshMessages.emit();
                editor.setContent('');
              });
            });
          }

        });
      } else {
        console.log('Error. No discussion id');
      }
    }
  }
}
