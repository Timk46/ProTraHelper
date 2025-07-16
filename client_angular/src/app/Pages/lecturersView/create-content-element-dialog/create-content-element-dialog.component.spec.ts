import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { CreateContentElementDialogComponent } from './create-content-element-dialog.component';

describe('CreateContentElementDialogComponent', () => {
  let component: CreateContentElementDialogComponent;
  let fixture: ComponentFixture<CreateContentElementDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateContentElementDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateContentElementDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
