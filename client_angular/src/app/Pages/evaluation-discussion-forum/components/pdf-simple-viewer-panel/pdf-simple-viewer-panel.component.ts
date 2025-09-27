import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SecurityContext,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import * as pdfjsLib from 'pdfjs-dist';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { EvaluationSubmissionDTO } from '@DTOs/index';
import { ProductionFilesService } from '../../../../Services/files/production-files.service';

// Point pdfjs to the external (or local) worker file that matches the installed pdfjsLib version.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

@Component({
  selector: 'app-pdf-simple-viewer-panel',
  standalone: true,
  imports: [NgIf, MatProgressSpinner],
  templateUrl: './pdf-simple-viewer-panel.component.html',
  styleUrl: './pdf-simple-viewer-panel.component.scss',
})
export class PdfSimpleViewerPanelComponent implements OnDestroy, OnChanges {
  @Input() uploadFileId: number | undefined = undefined;
  @Input() submission: EvaluationSubmissionDTO | null = null;
  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  pdfSrc: SafeUrl = '';
  private objectUrl?: string;

  // Basic detection for iPad
  isIpad: boolean = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;

  isLoading: boolean = true;
  loadingProgress: number = 0;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef,
    private readonly productionFilesService: ProductionFilesService,
  ) {}

  ngOnInit() {
    //this.pdfFromFileUploadId(this.uploadFileId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['uploadFileId'] && this.uploadFileId) {
      console.log('VIEWER HERE:', this.uploadFileId);
      this.pdfFromFileUploadId(this.uploadFileId);
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  ngAfterViewInit() {
    if (this.isIpad) {
      this.loadPdfForIpad(this.pdfSrc);
    }
  }

  /**
   * Loads and renders a PDF document specifically for iPad devices by converting each page into canvas elements.
   * This method is necessary because iPads have limited PDF viewer support in browsers.
   * @param {SafeUrl} pdfSrc - The SafeUrl containing the PDF source URL to load
   * @returns void
   * @throws Error if PDF loading or rendering fails
   */
  loadPdfForIpad(pdfSrc: SafeUrl) {
    const pdfUrl = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, pdfSrc) as string;
    if (!pdfUrl) return;

    const container = this.pdfViewer.nativeElement;
    container.innerHTML = ''; // Clear any previous content

    this.isLoading = true;
    this.loadingProgress = 0;
    this.cdr.markForCheck();

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise
      .then(async pdf => {
        const totalPages = pdf.numPages;
        const renderPromises: Promise<void>[] = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          // Push each page render promise to the array
          renderPromises.push(
            pdf
              .getPage(pageNum)
              .then(page => this.renderPage(page, container, pageNum, totalPages)),
          );
        }

        await Promise.all(renderPromises);
        this.isLoading = false;
        this.cdr.markForCheck();
      })
      .catch(error => {
        console.error('Error loading PDF:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  /**
   * Helper method to render a single page onto a canvas.
   */
  private async renderPage(
    page: pdfjsLib.PDFPageProxy,
    container: HTMLElement,
    pageNum: number,
    totalPages: number,
  ): Promise<void> {
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    container.appendChild(canvas);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // Render the page and update progress after it's done.
    await page.render(renderContext).promise;

    // Make the canvas responsive
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    canvas.style.marginTop = '5px';
    canvas.style.marginBottom = '5px';

    // Update progress
    this.loadingProgress = Math.round((pageNum / totalPages) * 100);
    this.cdr.markForCheck();
  }

  /**
   * Loads a PDF file for viewing based on the provided file upload ID.
   *
   * Constructs a secure URL to the PDF file using the given `fileUploadId`,
   * sanitizes the URL for safe usage in the application, and updates the
   * component's PDF source. Triggers change detection to ensure the view is updated.
   *
   * @param fileUploadId - The unique identifier of the uploaded PDF file to display.
   */
  pdfFromFileUploadId(fileUploadId: number) {
    this.isLoading = true;
    this.loadingProgress = 0;
    this.cdr.markForCheck();

    this.productionFilesService.downloadProductionFile(fileUploadId).subscribe({
      next: response => {
        const blob = response.body;
        if (!blob) {
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        // cleanup previous URL
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.objectUrl = url;
        this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);

        if (this.isIpad) {
          this.loadPdfForIpad(this.pdfSrc);
        } else {
          this.isLoading = false;
        }
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error downloading production PDF:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private revokeObjectUrl() {
    if (this.objectUrl) {
      try {
        URL.revokeObjectURL(this.objectUrl);
      } catch {}
      this.objectUrl = undefined;
    }
  }
}
