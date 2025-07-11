import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { FillinTaskNewComponent } from './fill-in-task-new.component';

describe('FillInTaskNewComponent', () => {
  let component: FillinTaskNewComponent;
  let fixture: ComponentFixture<FillinTaskNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FillinTaskNewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FillinTaskNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
