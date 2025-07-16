import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { TaskDescriptionPopupComponent } from './task-description-popup.component';

describe('TaskDescriptionPopupComponent', () => {
  let component: TaskDescriptionPopupComponent;
  let fixture: ComponentFixture<TaskDescriptionPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskDescriptionPopupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDescriptionPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
