import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBlankComponent } from './edit-blank.component';

describe('EditBlankComponent', () => {
  let component: EditBlankComponent;
  let fixture: ComponentFixture<EditBlankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditBlankComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBlankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
