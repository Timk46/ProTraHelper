import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DynamicBlankComponent } from './dynamic-blank.component';

describe('DynamicBlankComponent', () => {
  let component: DynamicBlankComponent;
  let fixture: ComponentFixture<DynamicBlankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DynamicBlankComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicBlankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
