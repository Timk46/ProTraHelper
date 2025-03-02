import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphTutorialDialogComponent } from './graph-tutorial-dialog.component';

describe('GraphTutorialDialogComponent', () => {
  let component: GraphTutorialDialogComponent;
  let fixture: ComponentFixture<GraphTutorialDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GraphTutorialDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphTutorialDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
