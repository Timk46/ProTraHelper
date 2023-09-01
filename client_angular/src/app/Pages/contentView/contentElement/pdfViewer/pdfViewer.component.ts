import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxExtendedPdfViewerService, pdfDefaultOptions } from 'ngx-extended-pdf-viewer';
import { ContentsForConceptDTO } from '@DTOs/content.dto';

import { FileService } from 'src/app/Services/files/files.service';

@Component({
  selector: 'app-pdfViewer',
  templateUrl: './pdfViewer.component.html',
  styleUrls: ['./pdfViewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit {

  uniqueIdentifier: String;

  pdfSrc = "https://vadimdez.github.io/ng2-pdf-viewer/assets/pdf-test.pdf";

  /** In most cases, you don't need the NgxExtendedPdfViewerService. It allows you
   *  to use the "find" api, to extract text and images from a PDF file,
   *  to print programmatically, and to show or hide layers by a method call.
  */
  constructor(private pdfService: NgxExtendedPdfViewerService, private route: ActivatedRoute, private fileService: FileService) {
    /* More likely than not you don't need to tweak the pdfDefaultOptions.
       They are a collecton of less frequently used options.
       To illustrate how they're used, here are two example settings: */
    pdfDefaultOptions.doubleTapZoomFactor = '150%'; // The default value is '200%'
    pdfDefaultOptions.maxCanvasPixels = 4096 * 4096 * 5; // The default value is 4096 * 4096 pixels,
    // but most devices support much higher resolutions.
    // Increasing this setting allows your users to use higher zoom factors,
    // trading image quality for performance.

    this.uniqueIdentifier = this.route.snapshot.params['uniqueIdentifier'];
    if (this.uniqueIdentifier != null) {
      console.log('uniqueIdentifier: ' + this.uniqueIdentifier);
      this.pdfFromUniqueIdentifier(this.uniqueIdentifier);
    }
  }

  ngOnInit() {
  }

  // just a demo how to connect pdf to the file service: http://localhost:4200/instruction/randomString1 (loads pdf from server_nestjs\src\storage\randomString1.pdf)
  pdfFromUniqueIdentifier(uniqueIdentifier: String){
    this.fileService.downloadFile(uniqueIdentifier).subscribe(response => {
      const blob = response.body;

      if (blob !== null) {
        const url = URL.createObjectURL(blob);
        this.pdfSrc = url;
      } else {
        console.error("no file found");
      }
    });
  }
}
