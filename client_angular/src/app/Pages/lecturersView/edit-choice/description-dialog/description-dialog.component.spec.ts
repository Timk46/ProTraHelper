import { ComponentFixture, TestBed } from '@angular/core/testing';

import { McTaskCreationComponent } from './mc-task-creation.component';

describe('McTaskCreationComponent', () => {
  let component: McTaskCreationComponent;
  let fixture: ComponentFixture<McTaskCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ McTaskCreationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(McTaskCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
