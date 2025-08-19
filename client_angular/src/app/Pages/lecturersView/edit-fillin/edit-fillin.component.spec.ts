import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { EditFillinComponent } from './edit-fillin.component';

describe('EditFillinComponent', () => {
  let component: EditFillinComponent;
  let fixture: ComponentFixture<EditFillinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditFillinComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditFillinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
