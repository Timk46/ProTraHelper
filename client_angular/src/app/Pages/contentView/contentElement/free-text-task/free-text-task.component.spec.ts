import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeTextTaskComponent } from './free-text-task.component';

describe('FreeTextTaskComponent', () => {
  let component: FreeTextTaskComponent;
  let fixture: ComponentFixture<FreeTextTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FreeTextTaskComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeTextTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
