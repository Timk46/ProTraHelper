import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { EditCodeGameComponent } from './edit-code-game.component';

describe('EditCodeGameComponent', () => {
  let component: EditCodeGameComponent;
  let fixture: ComponentFixture<EditCodeGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditCodeGameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCodeGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
