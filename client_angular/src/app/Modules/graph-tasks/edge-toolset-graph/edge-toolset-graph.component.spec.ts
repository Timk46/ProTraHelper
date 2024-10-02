import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdgeToolsetGraphComponent } from './edge-toolset-graph.component';

describe('EdgeToolsetGraphComponent', () => {
  let component: EdgeToolsetGraphComponent;
  let fixture: ComponentFixture<EdgeToolsetGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgeToolsetGraphComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EdgeToolsetGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
