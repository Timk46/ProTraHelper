
import { Component, Inject, Input, OnInit } from '@angular/core';
import { ContentDTO, ContentElementDTO } from '@DTOs/content.dto';
import  { FileDto} from '@DTOs/file.dto';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';
import { ContentService } from 'src/app/Services/content/content.service';
import { last } from 'rxjs';
import { NotificationService } from 'src/app/Services/notification/notification.service';

@Component({
  selector: 'app-contentView',
  templateUrl: './contentView.component.html',
  styleUrls: ['./contentView.component.css']
})
export class ContentViewComponent implements OnInit {

  contentViewData: ContentDTO;
  activeConceptNodeId: number;
  contentTypes: string[];
  viewableElements: ContentElementDTO[] = [];
  applyCompletedStyle: boolean[] = [];
  applyQuestionStyle: boolean[] = [];
  lastOpenedDate: Date = new Date();
  readableDate: string = 'dummy date';
  elementCount: number = 0;
  pdfCount: number = 0;

  // Get Data from Dialog
  constructor(
      public dialogRef: MatDialogRef<ContentViewComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      private sanitizer: DomSanitizer,
      private discussionDialogService: DiscussionDialogService,
      private contentService: ContentService,
      private notificationService: NotificationService) {
    this.contentViewData = data.contentViewData as ContentDTO;
    this.activeConceptNodeId = data.conceptNodeId as number;
    this.contentTypes = data.contentTypes;
    this.elementCount = this.contentViewData.contentElements.length;
    // filter contentElements by type
    this.viewableElements = this.contentViewData.contentElements.filter(x => this.contentTypes.includes(x.type));
    // sort contentElements by position
    this.viewableElements = this.viewableElements.sort((a, b) => a.positionInSpecificContentView - b.positionInSpecificContentView);
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
        if (status.userStatusQuestion) {
          this.applyQuestionStyle[i] = true;
        } else {
          this.applyQuestionStyle[i] = false;
        }
      });
    }
    // this.notificationService.getNotifications().subscribe(message => {
    //   console.log('Neue Benachrichtigung:', message.map(n => n.message));
    // })
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
    this.contentService.toggleContentElementCompletionStatus(contentElementId, this.activeConceptNodeId, this.contentViewData.level).subscribe(status => this.applyCompletedStyle[position] = status);
    if(typeof this.contentViewData.progress === 'number'){
      const sign = this.applyCompletedStyle[position] ? -1 : 1;
      this.contentViewData.progress = this.contentViewData.progress + (sign/this.elementCount * 100);
      if(100 - this.contentViewData.progress < 0.0001){
        this.contentViewData.progress = 100;
      }
    }
  }

  onToggleQuestionmark(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);
    this.contentService.toggleContentElementQuestionStatus(contentElementId).subscribe(status => this.applyQuestionStyle[position] = status);
    if(!this.applyQuestionStyle[position]){
      this.contentViewData.questionMarked = true;
    } else {
      for(let i = 0; i < this.applyQuestionStyle.length; i++){
        if(this.applyQuestionStyle[i] && i !== position){
          this.contentViewData.questionMarked = true;
          return;
        }
        this.contentViewData.questionMarked = false;
      }
    }
  }

  applyCheckmarkStyles(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);

    let styles = {'color' : 'red', 'background-color' : 'white'};
    if (this.applyCompletedStyle[position]) {
      styles = {'color' : 'white', 'background-color': '#a3be8c'};
    } else {
      styles = {'color' : 'gray', 'background-color': 'white'};
    }
    return styles;
  }

  applyQuestionmarkStyles(contentElementId: number) {
    const position = this.contentViewData.contentElements.findIndex(x => x.id === contentElementId);

    let styles = {'color' : 'white', 'background-color' : 'red'};
    if (this.applyQuestionStyle[position]) {
      styles = {'color' : 'white', 'background-color': '#b48ead'};
    } else {
      styles = {'color' : 'gray', 'background-color': 'white'};
    }
    return styles;
  }

  getLastOpenedDate(){
    //console.log('ContentViewComponent: getLastOpenedDate');
    this.contentService.updateLastOpenedDate(this.contentViewData.contentNodeId).subscribe(status => {this.lastOpenedDate = new Date(status); this.readableDate = this.getDateDisplay(this.lastOpenedDate);});
  }
    /**
   * Returns the date in a human readable format
   * @param date
   * @returns
   */
    getDateDisplay(date: Date): string {
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
