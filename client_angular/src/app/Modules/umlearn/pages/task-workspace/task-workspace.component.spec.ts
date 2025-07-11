import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { TaskWorkspaceComponent } from './task-workspace.component';

describe('TaskWorkspaceComponent', () => {
  let component: TaskWorkspaceComponent;
  let fixture: ComponentFixture<TaskWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskWorkspaceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
