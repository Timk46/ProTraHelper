import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-graph-tutorial-dialog',
  templateUrl: './graph-tutorial-dialog.component.html',
  styleUrls: ['./graph-tutorial-dialog.component.scss'],
})
export class GraphTutorialDialogComponent implements OnDestroy {

  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  // preventing Premature close conncetion error by closing the modal while video is loading
  ngOnDestroy() {
    this.stopAndResetVideo();
  }

  private stopAndResetVideo() {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      this.videoPlayer.nativeElement.pause();
      this.videoPlayer.nativeElement.src = '';
      this.videoPlayer.nativeElement.load();
    }
  }
}


