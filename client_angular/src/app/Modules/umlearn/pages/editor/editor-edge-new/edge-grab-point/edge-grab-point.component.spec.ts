import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdgeGrabPointComponent } from './edge-grab-point.component';

describe('EdgeGrabPointComponent', () => {
  let component: EdgeGrabPointComponent;
  let fixture: ComponentFixture<EdgeGrabPointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EdgeGrabPointComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdgeGrabPointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
