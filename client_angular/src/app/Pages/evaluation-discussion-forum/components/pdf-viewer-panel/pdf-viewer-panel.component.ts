import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
import { EvaluationSubmissionDTO } from '@DTOs/index';
import { FileService } from '../../../../Services/files/files.service';
import { environment } from '../../../../../environments/environment';

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
export class PdfViewerPanelComponent implements OnInit, OnDestroy {

  // =============================================================================
  // INPUTS - DATA FROM PARENT (SMART COMPONENT)
  // =============================================================================

  @Input() submission: EvaluationSubmissionDTO | null = null;
  @Input() pdfUrl: string | null = null;

  // Navigation inputs
  @Input() canNavigatePrevious: boolean = false;
  @Input() canNavigateNext: boolean = false;
  @Input() currentSubmissionTitle: string = '';
  @Input() submissionPosition: string = ''; // e.g., "3 von 5"

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private fileService: FileService
  ) {}

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)
  // =============================================================================

  @Output() pageChanged = new EventEmitter<number>();
  @Output() downloadRequested = new EventEmitter<void>();

  // Navigation outputs
  @Output() navigateToPrevious = new EventEmitter<void>();
  @Output() navigateToNext = new EventEmitter<void>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================

  currentPage: number = 1;
  totalPages: number = 1;
  zoomLevel: number = 100;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  // Safe PDF URL for iframe/object
  safePdfUrl: SafeResourceUrl | null = null;
  
  // Blob URL management
  private currentBlobUrl: string | null = null;

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
    console.log('🔎 PDF Viewer initialized with:', {
      submission: this.submission?.title,
      pdfUrl: this.pdfUrl,
      hasSubmission: !!this.submission,
      pdfFileId: this.submission?.pdfFileId,
      canNavigatePrevious: this.canNavigatePrevious,
      canNavigateNext: this.canNavigateNext,
      submissionTitle: this.currentSubmissionTitle,
      submissionPosition: this.submissionPosition,
      pdfFile: !!this.submission?.pdfFile
    });

    // Try to generate correct PDF URL
    const generatedPdfUrl = this.generatePdfUrl();
    
    if (generatedPdfUrl) {
      // Update the pdfUrl if we generated a better one
      if (!this.pdfUrl || this.pdfUrl !== generatedPdfUrl) {
        this.pdfUrl = generatedPdfUrl;
      }
      this.loadRealPdf();
    } else if (this.submission) {
      this.initializeMockPdfData();
      this.loadPdf();
    } else {
      console.log('📭 No submission or PDF data available');
      this.showNoDocumentState();
    }
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
        this.cdr.markForCheck(); // Trigger change detection for successful loading
      } else {
        this.hasError = true;
        this.errorMessage = 'PDF-Dokument konnte nicht geladen werden';
        this.isLoading = false;
        this.cdr.markForCheck(); // Trigger change detection for error state
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
    console.log('📥 Download PDF requested');

    // Try to get the best download URL
    const downloadUrl = this.generatePdfUrl();
    
    if (!downloadUrl) {
      console.error('❌ No download URL available');
      return;
    }

    // Check if we have a uniqueIdentifier for FileService download
    const uniqueIdentifier = this.submission?.pdfFile?.uniqueIdentifier;
    
    if (uniqueIdentifier) {
      console.log('📥 Using FileService for download with uniqueIdentifier:', uniqueIdentifier);
      this.downloadWithFileService(uniqueIdentifier);
    } else {
      console.log('📥 Using direct link download with URL:', downloadUrl);
      this.downloadWithDirectLink(downloadUrl);
    }
  }

  private downloadWithFileService(uniqueIdentifier: string): void {
    this.fileService.downloadFile(uniqueIdentifier).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.getFileName();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      },
      error: (error) => {
        console.error('❌ FileService download failed:', error);
        // Fallback to direct link if FileService fails
        const fallbackUrl = this.generatePdfUrl();
        if (fallbackUrl) {
          this.downloadWithDirectLink(fallbackUrl);
        }
      }
    });
  }

  private downloadWithDirectLink(url: string): void {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getFileName();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('❌ Direct link download failed:', error);
      // Final fallback: create mock PDF for demonstration
      this.downloadMockPdf();
    }
  }

  private downloadMockPdf(): void {
    const blob = new Blob(['Mock PDF Content - Real PDF not available'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
    // Handle both the new MDC slider event format and legacy format
    const value = event.value !== undefined ? event.value : event.target.value;
    this.setZoom(Number(value));
  }

  onRetryLoad(): void {
    this.loadPdf();
  }

  // =============================================================================
  // NAVIGATION METHODS
  // =============================================================================

  /**
   * Handles navigation to previous submission
   *
   * @description Emits the navigateToPrevious event to notify parent component
   * that user wants to navigate to the previous submission
   * @memberof PdfViewerPanelComponent
   */
  onNavigateToPrevious(): void {
    console.log('⬅️ PDF Viewer: Navigating to previous submission', {
      currentSubmission: this.submission?.id,
      canNavigatePrevious: this.canNavigatePrevious
    });
    this.navigateToPrevious.emit();
  }

  /**
   * Handles navigation to next submission
   *
   * @description Emits the navigateToNext event to notify parent component
   * that user wants to navigate to the next submission
   * @memberof PdfViewerPanelComponent
   */
  onNavigateToNext(): void {
    console.log('➡️ PDF Viewer: Navigating to next submission', {
      currentSubmission: this.submission?.id,
      canNavigateNext: this.canNavigateNext
    });
    this.navigateToNext.emit();
  }

  /**
   * Gets the title to display in the navigation bar
   *
   * @description Returns the submission title with fallback to default text
   * @returns string The title to display
   * @memberof PdfViewerPanelComponent
   */
  getNavigationTitle(): string {
    return this.currentSubmissionTitle || this.submission?.title || 'Abgabe Dokument';
  }

  // =============================================================================
  // NEW REAL PDF METHODS
  // =============================================================================

  /**
   * Generates the correct PDF URL based on submission data
   * Priority: pdfUrl > pdfFile.uniqueIdentifier > pdfMetadata.downloadUrl
   */
  private generatePdfUrl(): string | null {
    console.log('🔗 Generating PDF URL with data:', {
      pdfUrl: this.pdfUrl,
      pdfFile: this.submission?.pdfFile?.uniqueIdentifier,
      pdfMetadata: this.submission?.pdfMetadata?.downloadUrl
    });

    // Priority 1: Direct pdfUrl input
    if (this.pdfUrl) {
      return this.pdfUrl;
    }

    // Priority 2: Generate URL from pdfFile.uniqueIdentifier (correct approach)
    if (this.submission?.pdfFile?.uniqueIdentifier) {
      const generatedUrl = `${environment.server}/files/download/${this.submission.pdfFile.uniqueIdentifier}`;
      return generatedUrl;
    }

    // Priority 3: Fallback to pdfMetadata.downloadUrl
    if (this.submission?.pdfMetadata?.downloadUrl) {
      return this.submission.pdfMetadata.downloadUrl;
    }

    return null;
  }

  private loadRealPdf(): void {
    console.log('📄 Loading real PDF from URL:', this.pdfUrl);
    this.isLoading = true;
    this.hasError = false;

    if (this.pdfUrl) {
      try {
        // Try direct URL approach first (for object tag)
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
        console.log('🔒 Created safe PDF URL for object tag');

        // Set a timeout to check if direct approach works, otherwise use blob fallback
        setTimeout(() => {
          // Check if we should try blob fallback
          const shouldTryBlobFallback = this.submission?.pdfFile?.uniqueIdentifier;
          
          if (shouldTryBlobFallback) {
            this.loadPdfAsBlob();
          } else {
            this.isLoading = false;
            this.totalPages = 1; // Unknown page count for object
            this.currentPage = 1;
            this.cdr.markForCheck();
          }
        }, 1000);
      } catch (error) {
        console.error('❌ Error creating safe PDF URL:', error);
        this.tryBlobFallback();
      }
    } else {
      console.error('❌ No PDF URL provided to loadRealPdf');
      this.tryBlobFallback();
    }
  }

  /**
   * Load PDF as blob and create blob URL (robust fallback)
   */
  private loadPdfAsBlob(): void {
    const uniqueIdentifier = this.submission?.pdfFile?.uniqueIdentifier;
    
    if (!uniqueIdentifier) {
      console.error('❌ No uniqueIdentifier for blob loading');
      this.showPdfLoadError('Keine PDF-Identifikation verfügbar');
      return;
    }

    console.log('📥 Loading PDF as blob with uniqueIdentifier:', uniqueIdentifier);
    this.isLoading = true;
    this.hasError = false;

    this.fileService.downloadFile(uniqueIdentifier).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob && blob.type === 'application/pdf') {
          this.createBlobUrl(blob);
        } else {
          console.error('❌ Invalid blob type or empty blob');
          this.showPdfLoadError('Ungültiges PDF-Format');
        }
      },
      error: (error) => {
        console.error('❌ Blob download failed:', error);
        this.showPdfLoadError('Fehler beim Laden der PDF-Datei');
      }
    });
  }

  private createBlobUrl(blob: Blob): void {
    try {
      // Clean up previous blob URL
      if (this.currentBlobUrl) {
        window.URL.revokeObjectURL(this.currentBlobUrl);
      }

      // Create new blob URL
      this.currentBlobUrl = window.URL.createObjectURL(blob);
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl);
      
      this.isLoading = false;
      this.totalPages = 1; // Unknown page count for blob
      this.currentPage = 1;
      this.cdr.markForCheck();
      
    } catch (error) {
      console.error('❌ Error creating blob URL:', error);
      this.showPdfLoadError('Fehler beim Erstellen der PDF-Anzeige');
    }
  }

  private tryBlobFallback(): void {
    if (this.submission?.pdfFile?.uniqueIdentifier) {
      this.loadPdfAsBlob();
    } else {
      this.showPdfLoadError('Keine PDF-URL und keine Fallback-Option verfügbar');
    }
  }

  private showPdfLoadError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  private showNoDocumentState(): void {
    console.log('📭 No document to display');
    this.hasError = true;
    this.errorMessage = 'Kein PDF-Dokument verfügbar';
    this.isLoading = false;
    this.cdr.markForCheck(); // Trigger change detection for no document state
  }

  getRealPdfUrl(): SafeResourceUrl | null {
    return this.safePdfUrl;
  }

  hasRealPdf(): boolean {
    return !!this.pdfUrl;
  }

  // =============================================================================
  // LIFECYCLE CLEANUP
  // =============================================================================

  ngOnDestroy(): void {
    // Clean up blob URL to prevent memory leaks
    if (this.currentBlobUrl) {
      window.URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }
}
