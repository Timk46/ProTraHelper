import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserGroupingComponent } from './user-grouping.component';

describe('UserGroupingComponent', () => {
  let component: UserGroupingComponent;
  let fixture: ComponentFixture<UserGroupingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserGroupingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserGroupingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
