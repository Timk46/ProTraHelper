import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorEdgeNewComponent } from './editor-edge-new.component';

describe('EditorEdgeNewComponent', () => {
  let component: EditorEdgeNewComponent;
  let fixture: ComponentFixture<EditorEdgeNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditorEdgeNewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorEdgeNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
