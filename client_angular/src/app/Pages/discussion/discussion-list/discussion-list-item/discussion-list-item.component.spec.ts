import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DiscussionListItemComponent } from './discussion-list-item.component';

describe('DiscussionListItemComponent', () => {
  let component: DiscussionListItemComponent;
  let fixture: ComponentFixture<DiscussionListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscussionListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscussionListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
