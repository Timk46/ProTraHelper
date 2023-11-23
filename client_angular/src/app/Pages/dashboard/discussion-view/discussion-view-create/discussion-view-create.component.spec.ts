import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionViewCreateComponent } from './discussion-view-create.component';

describe('DiscussionViewCreateComponent', () => {
  let component: DiscussionViewCreateComponent;
  let fixture: ComponentFixture<DiscussionViewCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionViewCreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionViewCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
