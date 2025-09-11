/* tslint:disable:no-unused-variable */
import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { CodeTaskComponent } from './codeTask.component';

describe('CodeTaskComponent', () => {
  let component: CodeTaskComponent;
  let fixture: ComponentFixture<CodeTaskComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      declarations: [CodeTaskComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
