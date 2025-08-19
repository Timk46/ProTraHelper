import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DiscussionVoteboxComponent } from './discussion-votebox.component';

describe('DiscussionVoteboxComponent', () => {
  let component: DiscussionVoteboxComponent;
  let fixture: ComponentFixture<DiscussionVoteboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscussionVoteboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscussionVoteboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
