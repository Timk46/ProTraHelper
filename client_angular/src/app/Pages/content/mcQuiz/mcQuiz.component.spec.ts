/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { McQuizComponent } from './mcQuiz.component';

describe('McQuizComponent', () => {
  let component: McQuizComponent;
  let fixture: ComponentFixture<McQuizComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ McQuizComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(McQuizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
