import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MCDescriptionDialogComponent } from './description-dialog.component';

describe('DescriptionDialogComponent', () => {
  let component: MCDescriptionDialogComponent;
  let fixture: ComponentFixture<MCDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MCDescriptionDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MCDescriptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
