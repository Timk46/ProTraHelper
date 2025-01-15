
// NOTE: pdfjs-dist is throwing "Promise.withResolvers is not a function" in some scenarios.
// This is a workaround. Only keep it if your environment really needs it.

/*if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}*/


import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  SecurityContext,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import * as pdfjsLib from 'pdfjs-dist';

// Point pdfjs to the external (or local) worker file that matches the installed pdfjsLib version.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

@Component({
  selector: 'app-pdfViewer',
  templateUrl: './pdfViewer.component.html',
  styleUrls: ['./pdfViewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit, AfterViewInit {
  @Input() uniqueIdentifier: string = '';
  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  pdfSrc: SafeUrl = '';

  // Basic detection for iPad
  isIpad: boolean = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;

  isLoading: boolean = true;
  loadingProgress: number = 0;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.pdfFromUniqueIdentifier(this.uniqueIdentifier);
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
      .then(async (pdf) => {
        const totalPages = pdf.numPages;
        const renderPromises: Array<Promise<void>> = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          // Push each page render promise to the array
          renderPromises.push(
            pdf.getPage(pageNum).then((page) =>
              this.renderPage(page, container, pageNum, totalPages)
            )
          );
        }

        await Promise.all(renderPromises);
        this.isLoading = false;
        this.cdr.markForCheck();
      })
      .catch((error) => {
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
    totalPages: number
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
   * @param {string} uniqueIdentifier - The unique identifier of the PDF file to load
   * Fetches the PDF URL from your server and stores it in pdfSrc.
   * If on iPad, starts rendering immediately.
   */
  pdfFromUniqueIdentifier(uniqueIdentifier: string) {
    const pdfUrl = `${environment.server}/files/download/${uniqueIdentifier}`;
    this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    this.cdr.markForCheck();

    if (this.isIpad) {
      this.loadPdfForIpad(this.pdfSrc);
    }
  }
}
