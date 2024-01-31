import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentWorkspaceComponent } from './student-workspace.component';

describe('StudentWorkspaceComponent', () => {
  let component: StudentWorkspaceComponent;
  let fixture: ComponentFixture<StudentWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentWorkspaceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
