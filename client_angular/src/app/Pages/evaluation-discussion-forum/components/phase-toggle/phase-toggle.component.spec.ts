import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaseToggleComponent } from './phase-toggle.component';

describe('PhaseToggleComponent', () => {
  let component: PhaseToggleComponent;
  let fixture: ComponentFixture<PhaseToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhaseToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhaseToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
