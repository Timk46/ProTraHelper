
import { Component, Inject, Input, OnInit } from '@angular/core';
import { ContentDTO, ContentElementDTO } from '@DTOs/content.dto';
import  { FileDto} from '@DTOs/file.dto';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';
import { ContentService } from 'src/app/Services/content/content.service';
import { last } from 'rxjs';

@Component({
  selector: 'app-contentView',
  templateUrl: './contentView.component.html',
  styleUrls: ['./contentView.component.css']
})
export class ContentViewComponent implements OnInit {

  contentViewData: ContentDTO;
  activeConceptNodeId: number;
  applyCompletedStyle: boolean[] = [];
  applyQuestionStyle: boolean[] = [];
  lastOpenedDate: Date = new Date();
  readableDate: string = 'dummy date';
  pdfCount: number = 0;

  // Get Data from Dialog
  constructor(public dialogRef: MatDialogRef<ContentViewComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private sanitizer: DomSanitizer, private discussionDialogService: DiscussionDialogService, private contentService: ContentService) {
    this.contentViewData = data.contentViewData as ContentDTO;
    this.activeConceptNodeId = data.conceptNodeId as number;
    // sort contentElements by position
    this.contentViewData.contentElements = this.contentViewData.contentElements.sort((a, b) => a.position - b.position);
    // set default button style
    for(let i = 0; i < this.contentViewData.contentElements.length; i++) {
      this.applyCompletedStyle[i] = false;
      this.applyQuestionStyle[i] = false;
    }
    this.pdfCount = this.getPdfCount();
  }

  // for testing -> print ContentElems as String
  tempForTest(data: ContentElementDTO) :string {
    return JSON.stringify(data);
  }

  ngOnInit() {
    this.getLastOpenedDate();
    for (let i = 0; i < this.contentViewData.contentElements.length; i++) {
      this.contentService.getContentElementStatus(this.contentViewData.contentElements[i].id).subscribe(status => {
        if (status.userStatusCompleted) {
          this.applyCompletedStyle[i] = true;
        } else {
          this.applyCompletedStyle[i] = false;
        }
      });
      this.contentService.getContentElementStatus(this.contentViewData.contentElements[i].id).subscribe(status => {
        if (status.userStatusQuestion) {
          this.applyQuestionStyle[i] = true;
        } else {
          this.applyQuestionStyle[i] = false;
        }
      });
    }
  }

  // needed for pdf iframe (we need iframe for multiple pdfs in a row: https://pdfviewer.net/extended-pdf-viewer/side-by-side)
  getPdfUrl(uniqueIdentifier: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/pdfViewer/${uniqueIdentifier}`);
  }

  getPdfCount() {
    return this.contentViewData.contentElements.filter(x => x.type === 'PDF').length;
  }

  onCreateDiscussion(contentElementId: number) {
    this.discussionDialogService.openDiscussionCreation(this.activeConceptNodeId, this.contentViewData.contentNodeId, contentElementId);
    this.dialogRef.close();
  }

  onToggleCheckmark(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);
    this.contentService.toggleContentElementCompletionStatus(contentElementId).subscribe(status => this.applyCompletedStyle[position] = status);
  }

  onToggleQuestionmark(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);
    this.contentService.toggleContentElementQuestionStatus(contentElementId).subscribe(status => this.applyQuestionStyle[position] = status);
  }

  applyCheckmarkStyles(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);

    let styles = {'color' : 'red', 'background-color' : 'white', 'border-radius': '70%'};
    if (this.applyCompletedStyle[position]) {
      styles = {'color' : 'white', 'background-color': 'green', 'border-radius': '70%'};
    } else {
      styles = {'color' : 'gray', 'background-color': 'white', 'border-radius': '70%'};
    }
    return styles;
  }

  applyQuestionmarkStyles(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);

    let styles = {'color' : 'white', 'background-color' : 'red', 'border-radius': '70%'};
    if (this.applyQuestionStyle[position]) {
      styles = {'color' : 'white', 'background-color': 'purple', 'border-radius': '70%'};
    } else {
      styles = {'color' : 'gray', 'background-color': 'white', 'border-radius': '70%'};
    }
    return styles;
  }

  getCompletedTooltip(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);
    if (this.applyCompletedStyle[position]) {
      return 'Als nicht abgeschlossen markieren';
    } else {
      return 'Als abgeschlossen markieren';
    }
  }

  getQuestionTooltip(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);
    if (this.applyQuestionStyle[position]) {
      return 'Markierung entfernen';
    } else {
      return "Als 'Offene Frage(n)' markieren";
    }
  }

  getLastOpenedDate(){
    console.log('ContentViewComponent: getLastOpenedDate');
    this.contentService.updateLastOpenedDate(this.contentViewData.contentNodeId).subscribe(status => {this.lastOpenedDate = new Date(status); this.readableDate = this.getDateDisplay(this.lastOpenedDate);});
  }
    /**
   * Returns the date in a human readable format
   * @param date
   * @returns
   */
    getDateDisplay(date: Date): string {
      console.log("getDateDisplay called");
      const today = new Date();
      const newDate = new Date(date);
      const dbDate = new Date(date);
      today.setHours(0, 0, 0, 0); // set time to 00:00:00.000
      if (newDate.setHours(0, 0, 0, 0) === today.getTime()) {
        return `Heute ${dbDate.getHours()}:${dbDate.getMinutes()< 10 ? '0' : ''}${dbDate.getMinutes()} Uhr`;
      } else {
        return `${newDate.getDate()}.${newDate.getMonth() + 1}.${newDate.getFullYear()}`;
      }
    }

}
