import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupReviewSessionComponent } from './group-review-session.component';

describe('GroupReviewSessionComponent', () => {
  let component: GroupReviewSessionComponent;
  let fixture: ComponentFixture<GroupReviewSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupReviewSessionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupReviewSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
