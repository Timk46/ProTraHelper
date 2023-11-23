import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionViewQuestionComponent } from './discussion-view-question.component';

describe('DiscussionViewQuestionComponent', () => {
  let component: DiscussionViewQuestionComponent;
  let fixture: ComponentFixture<DiscussionViewQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionViewQuestionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionViewQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
