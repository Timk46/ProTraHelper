import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { EditFreetextComponent } from './edit-freetext.component';

describe('EditFreetextComponent', () => {
  let component: EditFreetextComponent;
  let fixture: ComponentFixture<EditFreetextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditFreetextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditFreetextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
