import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfSimpleViewerPanelComponent } from './pdf-simple-viewer-panel.component';

describe('PdfSimpleViewerPanelComponent', () => {
  let component: PdfSimpleViewerPanelComponent;
  let fixture: ComponentFixture<PdfSimpleViewerPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfSimpleViewerPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfSimpleViewerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
