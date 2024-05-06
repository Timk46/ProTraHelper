import { 
  Component, 
  Input, 
  OnInit, 
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';


@Component({
  selector: 'app-pdfViewer',
  templateUrl: './pdfViewer.component.html',
  styleUrls: ['./pdfViewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfViewerComponent implements OnInit {

  @Input() uniqueIdentifier: String  = "";
  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  pdfSrc: SafeUrl = '';


  /** In most cases, you don't need the NgxExtendedPdfViewerService. It allows you
   *  to use the "find" api, to extract text and images from a PDF file,
   *  to print programmatically, and to show or hide layers by a method call.
  */
  constructor(private route: ActivatedRoute, private readonly sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.pdfFromUniqueIdentifier(this.uniqueIdentifier);
  }

  // just a demo how to connect pdf to the file service: http://localhost:4200/instruction/randomString1 (loads pdf from server_nestjs\src\storage\randomString1.pdf)
  pdfFromUniqueIdentifier(uniqueIdentifier: String){
    const pdfUrl = `${environment.server}/files/download/${uniqueIdentifier}`;
    this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  }
}
