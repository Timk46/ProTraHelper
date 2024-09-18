import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphTaskComponent } from './graph-task.component';

describe('GraphTaskComponent', () => {
  let component: GraphTaskComponent;
  let fixture: ComponentFixture<GraphTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraphTaskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
