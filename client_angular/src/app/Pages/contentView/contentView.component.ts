
import { Component, Inject, Input, OnInit } from '@angular/core';
import { ContentDTO, ContentElementDTO } from '@DTOs/content.dto';
import  { FileDto} from '@DTOs/file.dto';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';
import { ContentService } from 'src/app/Services/content/content.service';

@Component({
  selector: 'app-contentView',
  templateUrl: './contentView.component.html',
  styleUrls: ['./contentView.component.css']
})
export class ContentViewComponent implements OnInit {

  contentViewData: ContentDTO;
  activeConceptNodeId: number;
  bntCompletedStyle: string;

  // Get Data from Dialog
  constructor(public dialogRef: MatDialogRef<ContentViewComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private sanitizer: DomSanitizer, private discussionDialogService: DiscussionDialogService, private contentService: ContentService) {
    this.contentViewData = data.contentViewData as ContentDTO;
    this.activeConceptNodeId = data.conceptNodeId as number;
    // sort contentElements by position
    this.contentViewData.contentElements = this.contentViewData.contentElements.sort((a, b) => a.position - b.position);
    // set default button style
    this.bntCompletedStyle = 'btn-default';
  }

  // for testing -> print ContentElems as String
  tempForTest(data: ContentElementDTO) :string {
    return JSON.stringify(data);
  }

  ngOnInit() {
    for (let i = 0; i < this.contentViewData.contentElements.length; i++) {
      console.log('ContentElement: ', this.contentViewData.contentElements[i]);
      this.contentService.getContentElementCompletionStatus(this.contentViewData.contentElements[i].id).subscribe(status => {
        if (status.userStatusCompleted) {
          this.bntCompletedStyle = 'btn-completed';
        } else {
          this.bntCompletedStyle = 'btn-default';
        }
        console.log(status.contentElementId + ' ' + status.userStatusCompleted);
      });
    }
  }

  // needed for pdf iframe (we need iframe for multiple pdfs in a row: https://pdfviewer.net/extended-pdf-viewer/side-by-side)
  getPdfUrl(uniqueIdentifier: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/pdfViewer/${uniqueIdentifier}`);
  }

  onCreateDiscussion(contentElementId: number) {
    this.discussionDialogService.openDiscussionCreation(this.activeConceptNodeId, this.contentViewData.contentNodeId, contentElementId);
    this.dialogRef.close();
  }

  onToggleCheckmark(contentElementId: number) {
    if (this.bntCompletedStyle == 'btn-default') {
      this.bntCompletedStyle = 'btn-completed';
    } else {
      this.bntCompletedStyle = 'btn-default';
    }
  }

}
