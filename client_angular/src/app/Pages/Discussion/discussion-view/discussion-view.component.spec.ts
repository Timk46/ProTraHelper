import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionViewComponent } from './discussion-view.component';

describe('DiscussionViewComponent', () => {
  let component: DiscussionViewComponent;
  let fixture: ComponentFixture<DiscussionViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
