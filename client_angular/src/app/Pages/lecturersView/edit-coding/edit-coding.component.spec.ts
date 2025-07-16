import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { EditCodingComponent } from './edit-coding.component';

describe('EditCodingComponent', () => {
  let component: EditCodingComponent;
  let fixture: ComponentFixture<EditCodingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditCodingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCodingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
