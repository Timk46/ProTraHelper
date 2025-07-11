import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { GradingOverviewComponent } from './grading-overview.component';

describe('GradingOverviewComponent', () => {
  let component: GradingOverviewComponent;
  let fixture: ComponentFixture<GradingOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradingOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GradingOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
