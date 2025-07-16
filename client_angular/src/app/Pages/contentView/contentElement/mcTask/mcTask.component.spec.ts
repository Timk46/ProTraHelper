/* tslint:disable:no-unused-variable */
import { ComponentFixture } from '@angular/core/testing';
import { async, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { McTaskComponent } from './mcTask.component';

describe('McTaskComponent', () => {
  let component: McTaskComponent;
  let fixture: ComponentFixture<McTaskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [McTaskComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(McTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
