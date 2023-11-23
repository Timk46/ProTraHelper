import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionCreationComponent } from './discussion-creation.component';

describe('DiscussionCreationComponent', () => {
  let component: DiscussionCreationComponent;
  let fixture: ComponentFixture<DiscussionCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionCreationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
