import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { CreateContentNodeDialogComponent } from './create-content-node-dialog.component';

describe('CreateContentNodeDialogComponent', () => {
  let component: CreateContentNodeDialogComponent;
  let fixture: ComponentFixture<CreateContentNodeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateContentNodeDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateContentNodeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
