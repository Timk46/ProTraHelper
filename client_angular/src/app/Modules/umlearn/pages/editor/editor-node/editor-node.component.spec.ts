import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorNodeComponent } from './editor-node.component';

describe('EditorNodeComponent', () => {
  let component: EditorNodeComponent;
  let fixture: ComponentFixture<EditorNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditorNodeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
