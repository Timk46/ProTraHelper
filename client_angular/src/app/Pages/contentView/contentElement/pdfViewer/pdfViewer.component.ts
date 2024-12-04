// Polyfill
// NOTE: pdfjs-dist is throwing Promise.withResolvers is not a function
// This is a workaround to fix the issue
/* interface PromiseConstructor {
  withResolvers<T>(): { promise: Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void };
} */

// @ts-ignore
if (typeof Promise.withResolvers !== 'function') {
  // @ts-ignore
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
}



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
import { ActivatedRoute } from '@angular/router';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import * as pdfjsLib from 'pdfjs-dist';

// Add worker to pdfjsLib via extern
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
//pdfjsLib.GlobalWorkerOptions.workerSrc = `../../../../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs`; - doesnt work



@Component({
  selector: 'app-pdfViewer',
  templateUrl: './pdfViewer.component.html',
  styleUrls: ['./pdfViewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit, AfterViewInit {

  @Input() uniqueIdentifier: String  = "";
  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  pdfSrc: SafeUrl = '';

  isIpad: boolean = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;

  isLoading: boolean = true;
  loadingProgress: number = 0;

  /** In most cases, you don't need the NgxExtendedPdfViewerService. It allows you
   *  to use the "find" api, to extract text and images from a PDF file,
   *  to print programmatically, and to show or hide layers by a method call.
  */
  constructor(
    private route: ActivatedRoute,
    private readonly sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.pdfFromUniqueIdentifier(this.uniqueIdentifier);
  }

  ngAfterViewInit() {
    if (this.isIpad) {
      this.loadPdfForIpad(this.pdfSrc);
    }
  }

  loadPdfForIpad(pdfSrc: SafeUrl) {
    const pdfUrl = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, pdfSrc) as string;
    const container = this.pdfViewer.nativeElement;
    container.innerHTML = '';

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    console.log('loadingTask', loadingTask);

    pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
      console.log('pdf', pdf);
      const renderPromises = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        renderPromises.push(pdf.getPage(pageNum).then((page) => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          container.appendChild(canvas);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          return page.render(renderContext).promise.then(() => {
            // Ensure the canvas is responsive after rendering
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
            canvas.style.marginTop = '5px';
            canvas.style.marginBottom = '5px';
          });
        }));
        this.loadingProgress = Math.round((pageNum / pdf.numPages) * 100);
        this.cdr.detectChanges();
      }

      return Promise.all(renderPromises).then(() => {
        console.log('fertig geladen');
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    });

    console.log('this.isLoading', this.isLoading);
  }

  // just a demo how to connect pdf to the file service: http://localhost:4200/instruction/randomString1 (loads pdf from server_nestjs\src\storage\randomString1.pdf)
  pdfFromUniqueIdentifier(uniqueIdentifier: String){
    const pdfUrl = `${environment.server}/files/download/${uniqueIdentifier}`;
    this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }
}
