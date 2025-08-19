import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { GradingUploadComponent } from './grading-upload.component';

describe('GradingUploadComponent', () => {
  let component: GradingUploadComponent;
  let fixture: ComponentFixture<GradingUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradingUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradingUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
