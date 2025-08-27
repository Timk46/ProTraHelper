import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOverviewDialogComponent } from './edit-overview-dialog.component';

describe('EditOverviewDialogComponent', () => {
  let component: EditOverviewDialogComponent;
  let fixture: ComponentFixture<EditOverviewDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOverviewDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditOverviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
