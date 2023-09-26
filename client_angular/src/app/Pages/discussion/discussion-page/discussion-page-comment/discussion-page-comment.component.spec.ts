import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionPageCommentComponent } from './discussion-page-comment.component';

describe('DiscussionPageCommentComponent', () => {
  let component: DiscussionPageCommentComponent;
  let fixture: ComponentFixture<DiscussionPageCommentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionPageCommentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionPageCommentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
