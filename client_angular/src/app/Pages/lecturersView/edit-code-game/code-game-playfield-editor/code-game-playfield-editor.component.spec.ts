import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeGamePlayfieldEditorComponent } from './code-game-playfield-editor.component';

describe('CodeGamePlayfieldEditorComponent', () => {
  let component: CodeGamePlayfieldEditorComponent;
  let fixture: ComponentFixture<CodeGamePlayfieldEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodeGamePlayfieldEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeGamePlayfieldEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
