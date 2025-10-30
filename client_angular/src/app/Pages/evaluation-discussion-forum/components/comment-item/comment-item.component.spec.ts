import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CommentItemComponent } from './comment-item.component';
import { CommentPanelStateService } from '../../../../Services/evaluation/comment-panel-state.service';
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import { VoteSessionService } from '../../../../Services/evaluation/vote-session.service';
import { CommentVoteManagerService } from '../../../../Services/evaluation/comment-vote-manager.service';

describe('CommentItemComponent', () => {
  let component: CommentItemComponent;
  let fixture: ComponentFixture<CommentItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommentItemComponent,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        CommentPanelStateService,
        EvaluationStateService,
        VoteSessionService,
        CommentVoteManagerService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommentItemComponent);
    component = fixture.componentInstance;

    // Provide required inputs before detectChanges
    component.comment = {
      id: 1,
      content: 'Test comment',
      createdAt: new Date(),
      authorId: 1,
      submissionId: 1,
      categoryId: 1,
      author: {
        id: 1,
        type: 'anonymous',
        displayName: 'User 1',
        colorCode: '#FF0000'
      },
      voteStats: {
        upVotes: 0
      },
      replyCount: 0,
      votes: [] // Add votes array
    } as any;

    component.anonymousUser = {
      id: 2,
      displayName: 'User 2',
      colorCode: '#00FF00'
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
