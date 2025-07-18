import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// DTOs
import { EvaluationSubmissionDTO } from '@dtos';

@Component({
  selector: 'app-pdf-viewer-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './pdf-viewer-panel.component.html',
  styleUrl: './pdf-viewer-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerPanelComponent implements OnInit {
  
  // =============================================================================
  // INPUTS - DATA FROM PARENT (SMART COMPONENT)
  // =============================================================================
  
  @Input() submission: EvaluationSubmissionDTO | null = null;
  @Input() pdfUrl: string | null = null;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)  
  // =============================================================================
  
  @Output() pageChanged = new EventEmitter<number>();
  @Output() downloadRequested = new EventEmitter<void>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================
  
  currentPage: number = 1;
  totalPages: number = 1;
  zoomLevel: number = 100;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Mock PDF data for demonstration
  mockPdfPages: string[] = [];
  
  // Zoom settings
  readonly minZoom = 50;
  readonly maxZoom = 200;
  readonly zoomStep = 25;

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================
  
  ngOnInit(): void {
    this.initializeMockPdfData();
    this.loadPdf();
  }

  // =============================================================================
  // PDF MANAGEMENT METHODS
  // =============================================================================
  
  private initializeMockPdfData(): void {
    // Create mock PDF page content based on submission data
    if (this.submission) {
      const pageCount = this.submission.pdfMetadata?.pageCount || 4;
      this.totalPages = pageCount;
      
      // Generate mock page content
      for (let i = 1; i <= pageCount; i++) {
        this.mockPdfPages.push(this.generateMockPageContent(i));
      }
    } else {
      this.totalPages = 4;
      this.mockPdfPages = [
        this.generateMockPageContent(1),
        this.generateMockPageContent(2), 
        this.generateMockPageContent(3),
        this.generateMockPageContent(4)
      ];
    }
  }

  private generateMockPageContent(pageNumber: number): string {
    const title = this.submission?.title || 'Architektur-Entwurf';
    
    switch (pageNumber) {
      case 1:
        return `
          <div class="mock-pdf-page">
            <h1>${title}</h1>
            <h2>Seite ${pageNumber}: Deckblatt und Übersicht</h2>
            <div class="content-block">
              <p><strong>Projektname:</strong> ${title}</p>
              <p><strong>Autor:</strong> ${this.submission?.author?.firstname || 'Max'} ${this.submission?.author?.lastname || 'Mustermann'}</p>
              <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
            </div>
            <div class="diagram-placeholder">
              <div class="diagram-box">
                [Übersichtsdiagramm]
              </div>
            </div>
          </div>
        `;
      case 2:
        return `
          <div class="mock-pdf-page">
            <h2>Seite ${pageNumber}: Grundrisse und Detailansichten</h2>
            <div class="content-block">
              <p>Detaillierte Grundrisse mit Bemaßungen und konstruktiven Details.</p>
            </div>
            <div class="diagram-placeholder">
              <div class="diagram-box large">
                [Grundriss EG - 1:100]
              </div>
              <div class="diagram-box">
                [Grundriss OG - 1:100]
              </div>
            </div>
          </div>
        `;
      case 3:
        return `
          <div class="mock-pdf-page">
            <h2>Seite ${pageNumber}: Schnitte und Ansichten</h2>
            <div class="content-block">
              <p>Konstruktive Schnitte und Fassadenansichten mit Materialangaben.</p>
            </div>
            <div class="diagram-placeholder">
              <div class="diagram-box">
                [Längsschnitt A-A - 1:100]
              </div>
              <div class="diagram-box">
                [Westfassade - 1:100]
              </div>
            </div>
          </div>
        `;
      case 4:
        return `
          <div class="mock-pdf-page">
            <h2>Seite ${pageNumber}: Details und Spezifikationen</h2>
            <div class="content-block">
              <p>Konstruktionsdetails, Materialliste und technische Spezifikationen.</p>
            </div>
            <div class="diagram-placeholder">
              <div class="diagram-box small">
                [Detail 1 - Fundament - 1:20]
              </div>
              <div class="diagram-box small">
                [Detail 2 - Dachaufbau - 1:20]
              </div>
              <div class="diagram-box small">
                [Detail 3 - Fensteranschluss - 1:5]
              </div>
            </div>
          </div>
        `;
      default:
        return `
          <div class="mock-pdf-page">
            <h2>Seite ${pageNumber}</h2>
            <div class="content-block">
              <p>Weitere Dokumentation und Anhänge.</p>
            </div>
          </div>
        `;
    }
  }

  private loadPdf(): void {
    this.isLoading = true;
    this.hasError = false;
    
    // Simulate PDF loading
    setTimeout(() => {
      if (this.pdfUrl || this.submission) {
        this.isLoading = false;
      } else {
        this.hasError = true;
        this.errorMessage = 'PDF-Dokument konnte nicht geladen werden';
        this.isLoading = false;
      }
    }, 1000);
  }

  // =============================================================================
  // NAVIGATION METHODS
  // =============================================================================
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.pageChanged.emit(this.currentPage);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  // =============================================================================
  // ZOOM METHODS
  // =============================================================================
  
  setZoom(zoomLevel: number): void {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
  }

  zoomIn(): void {
    this.setZoom(this.zoomLevel + this.zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.zoomLevel - this.zoomStep);
  }

  resetZoom(): void {
    this.setZoom(100);
  }

  // =============================================================================
  // DOWNLOAD METHODS
  // =============================================================================
  
  downloadPdf(): void {
    this.downloadRequested.emit();
    
    // Mock download functionality
    if (this.pdfUrl) {
      // In a real implementation, this would trigger an actual download
      const link = document.createElement('a');
      link.href = this.pdfUrl;
      link.download = this.getFileName();
      link.click();
    } else {
      // Mock download for demonstration
      const blob = new Blob(['Mock PDF Content'], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getFileName();
      link.click();
      window.URL.revokeObjectURL(url);
    }
  }

  private getFileName(): string {
    const title = this.submission?.title || 'dokument';
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanTitle}.pdf`;
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================
  
  getCurrentPageContent(): string {
    return this.mockPdfPages[this.currentPage - 1] || '';
  }

  getPageInfo(): string {
    return `Seite ${this.currentPage} von ${this.totalPages}`;
  }

  canGoToPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  canGoToNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  canZoomIn(): boolean {
    return this.zoomLevel < this.maxZoom;
  }

  canZoomOut(): boolean {
    return this.zoomLevel > this.minZoom;
  }

  getZoomPercentage(): string {
    return `${this.zoomLevel}%`;
  }

  hasValidPdf(): boolean {
    return !this.hasError && (!!this.pdfUrl || !!this.submission);
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  onPageInputChange(event: any): void {
    const page = parseInt(event.target.value, 10);
    if (!isNaN(page)) {
      this.goToPage(page);
    }
  }

  onZoomSliderChange(event: any): void {
    this.setZoom(event.value);
  }

  onRetryLoad(): void {
    this.loadPdf();
  }
}
