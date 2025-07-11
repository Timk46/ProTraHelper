import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { EditUmlComponent } from './edit-uml.component';

describe('EditUmlComponent', () => {
  let component: EditUmlComponent;
  let fixture: ComponentFixture<EditUmlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditUmlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUmlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
