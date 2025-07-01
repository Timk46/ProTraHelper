import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUploadComponent } from './edit-upload.component';

describe('EditUploadComponent', () => {
  let component: EditUploadComponent;
  let fixture: ComponentFixture<EditUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
