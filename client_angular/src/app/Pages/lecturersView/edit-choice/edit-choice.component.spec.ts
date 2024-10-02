import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditChoiceComponent } from './edit-choice.component';

describe('EditChoiceComponent', () => {
  let component: EditChoiceComponent;
  let fixture: ComponentFixture<EditChoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditChoiceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditChoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
