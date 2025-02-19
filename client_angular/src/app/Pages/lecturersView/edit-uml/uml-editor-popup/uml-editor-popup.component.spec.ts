import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UmlEditorPopupComponent } from './uml-editor-popup.component';

describe('UmlEditorPopupComponent', () => {
  let component: UmlEditorPopupComponent;
  let fixture: ComponentFixture<UmlEditorPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UmlEditorPopupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UmlEditorPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
