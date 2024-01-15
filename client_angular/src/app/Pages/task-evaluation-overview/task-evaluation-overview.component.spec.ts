import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskEvaluationOverviewComponent } from './task-evaluation-overview.component';

describe('TaskEvaluationOverviewComponent', () => {
  let component: TaskEvaluationOverviewComponent;
  let fixture: ComponentFixture<TaskEvaluationOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TaskEvaluationOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskEvaluationOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
