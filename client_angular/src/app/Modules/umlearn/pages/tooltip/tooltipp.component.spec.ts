import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { TooltippComponent } from './tooltipp.component';

describe('TooltippComponent', () => {
  let component: TooltippComponent;
  let fixture: ComponentFixture<TooltippComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TooltippComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltippComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
