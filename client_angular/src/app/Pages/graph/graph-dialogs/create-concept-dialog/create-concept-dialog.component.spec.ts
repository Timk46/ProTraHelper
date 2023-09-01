import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateConceptDialogComponent } from './create-concept-dialog.component';

describe('CreateConceptDialogComponent', () => {
  let component: CreateConceptDialogComponent;
  let fixture: ComponentFixture<CreateConceptDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateConceptDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateConceptDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
