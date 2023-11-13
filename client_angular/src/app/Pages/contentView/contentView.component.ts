
import { Component, Inject, Input, OnInit } from '@angular/core';
import { ContentDTO, ContentElementDTO } from '@DTOs/content.dto';
import  { FileDto} from '@DTOs/file.dto';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';

@Component({
  selector: 'app-contentView',
  templateUrl: './contentView.component.html',
  styleUrls: ['./contentView.component.css']
})
export class ContentViewComponent implements OnInit {

  contentViewData: ContentDTO;
  activeConceptNodeId: number;

  // Get Data from Dialog
  constructor(public dialogRef: MatDialogRef<ContentViewComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private sanitizer: DomSanitizer, private discussionDialogService: DiscussionDialogService) {
    this.contentViewData = data.contentViewData as ContentDTO;
    this.activeConceptNodeId = data.conceptNodeId as number;
    // sort contentElements by position
    this.contentViewData.contentElements = this.contentViewData.contentElements.sort((a, b) => a.position - b.position);
  }

  // for testing -> print ContentElems as String
  tempForTest(data: ContentElementDTO) :string {
    return JSON.stringify(data);
  }

  ngOnInit() {
  }

  // needed for pdf iframe (we need iframe for multiple pdfs in a row: https://pdfviewer.net/extended-pdf-viewer/side-by-side)
  getPdfUrl(uniqueIdentifier: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/pdfViewer/${uniqueIdentifier}`);
  }

  onCreateDiscussion(contentElementId: number) {
    this.discussionDialogService.openDiscussionCreation(this.activeConceptNodeId, this.contentViewData.contentNodeId, contentElementId, 1); //TODO: rewrite when auth is implemented
    this.dialogRef.close();
  }

}
