import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerPanelComponent } from './pdf-viewer-panel.component';

describe('PdfViewerPanelComponent', () => {
  let component: PdfViewerPanelComponent;
  let fixture: ComponentFixture<PdfViewerPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewerPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfViewerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
