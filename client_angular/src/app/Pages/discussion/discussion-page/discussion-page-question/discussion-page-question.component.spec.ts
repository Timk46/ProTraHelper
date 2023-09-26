import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionPageQuestionComponent } from './discussion-page-question.component';

describe('DiscussionPageQuestionComponent', () => {
  let component: DiscussionPageQuestionComponent;
  let fixture: ComponentFixture<DiscussionPageQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionPageQuestionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionPageQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
