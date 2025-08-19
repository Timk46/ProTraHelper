import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum.component';

describe('EvaluationDiscussionForumComponent', () => {
  let component: EvaluationDiscussionForumComponent;
  let fixture: ComponentFixture<EvaluationDiscussionForumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationDiscussionForumComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationDiscussionForumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
