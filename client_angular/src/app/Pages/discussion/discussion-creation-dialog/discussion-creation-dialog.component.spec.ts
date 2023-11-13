import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscussionCreationDialogComponent } from './discussion-creation-dialog.component';

describe('DiscussionCreationDialogComponent', () => {
  let component: DiscussionCreationDialogComponent;
  let fixture: ComponentFixture<DiscussionCreationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiscussionCreationDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscussionCreationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
