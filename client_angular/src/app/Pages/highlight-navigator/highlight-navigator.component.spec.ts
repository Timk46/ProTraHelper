import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { HighlightNavigatorComponent } from './highlight-navigator.component';

describe('HighlightNavigatorComponent', () => {
  let component: HighlightNavigatorComponent;
  let fixture: ComponentFixture<HighlightNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HighlightNavigatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HighlightNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
