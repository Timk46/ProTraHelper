import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MCScoreComponent } from './score.component';

describe('ScoreComponent', () => {
  let component: MCScoreComponent;
  let fixture: ComponentFixture<MCScoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MCScoreComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MCScoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
