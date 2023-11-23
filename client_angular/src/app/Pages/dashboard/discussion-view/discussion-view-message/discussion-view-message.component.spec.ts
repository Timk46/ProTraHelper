import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionViewMessageComponent } from './discussion-view-message.component';

describe('DiscussionViewMessageComponent', () => {
  let component: DiscussionViewMessageComponent;
  let fixture: ComponentFixture<DiscussionViewMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionViewMessageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionViewMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
