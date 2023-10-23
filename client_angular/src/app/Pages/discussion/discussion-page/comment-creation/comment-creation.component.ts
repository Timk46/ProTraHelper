import { discussionMessageCreationDTO } from '@DTOs/discussionCreation.dto';
import { AnonymousUserDTO } from '@DTOs/user.dto';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreationService } from 'src/app/Services/discussion/creation.service';

@Component({
  selector: 'app-comment-creation',
  templateUrl: './comment-creation.component.html',
  styleUrls: ['./comment-creation.component.scss']
})
export class CommentCreationComponent {

  expanded: Boolean = false
  expanderTitle: String = 'Dem Beitrag antworten'

  @Input() userId: number = -1;
  @Input() discussionId: number = -1;

  @Output() refreshMessages = new EventEmitter<void>();

  anonymousUser: AnonymousUserDTO = {
    id: -1,
    userId: -1,
    anonymousName: 'dummy'
  }

  constructor(private creationService: CreationService) { }

  // haldles the expansion of the answer box
  onExpandAnswerBox() {
    this.expanded = !this.expanded;
  }

  /** Handles the submission of the comment
   * No empty comments are allowed.
   * Tries to check if the comment author has aleady commented on this discussion.
   * If not, a new anonymous user is created for this comment author in this discussion.
   * Finally it wraps the comment in a messageDTO and sends it to the backend.
   *
   * @param text the text of the comment
   */
  onSubmit(text: string) {
    console.log(text);
    // empty text is not allowed
    if (text && text != '') {
      // check if the user id and discussion id is present
      if (this.userId != -1 && this.discussionId != -1) {
        this.creationService.getAnonymousUser(this.userId, this.discussionId).subscribe(anonymousUser => {
          console.log(anonymousUser);
          // check if user has answered so far
          if (anonymousUser.id != -1){
            this.anonymousUser = anonymousUser;

          } else {
            //TODO create anonymous user
          }
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
            console.log(creationResult);
            this.expanded = false;
            // refresh the messages by telling the parent 'discussion-page' component to do so
            this.refreshMessages.emit();
          });
        });
      } else {
        console.log('Error. Not logged in!');
      }
    }
  }





}
