import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphStructureComponent } from './graph-structure.component';

describe('GraphComponent', () => {
  let component: GraphStructureComponent;
  let fixture: ComponentFixture<GraphStructureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphStructureComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraphStructureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
