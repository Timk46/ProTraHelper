import type { ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Component, Input, Sanitizer, SecurityContext, ViewChild } from '@angular/core';
import type { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import type { FileService } from 'src/app/Services/files/files.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-videoViewer',
  templateUrl: './videoViewer.component.html',
  styleUrls: ['./videoViewer.component.scss'],
})
export class VideoViewerComponent implements OnInit, OnDestroy {
  /**
   * A unique identifier (from FileDTO) for the video file to be displayed.
   * This is an input property and should be passed from the parent component.
   */
  @Input() uniqueIdentifier: string = '';
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;
  /**
   * Holds the sanitized URL of the video file.
   * This property is used for securely binding the video URL in the component's template.
   */
  videoUrl: SafeUrl = '';

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly fileService: FileService,
  ) {}

  ngOnInit(): void {
    this.videoFromUniqueIdentifier(this.uniqueIdentifier);
  }

  // preventing Premature close conncetion error by closing the modal while video is loading
  ngOnDestroy() {
    this.stopAndResetVideo();
  }

  /**
   * Fetches and prepares the video for display based on a unique identifier.
   *
   * @param uniqueIdentifier A unique string identifier for fetching the video.
   */
  videoFromUniqueIdentifier(uniqueIdentifier: string) {
    const videoUrl = `${environment.server}/files/download/Video/${uniqueIdentifier}`;
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl);
  }

  private stopAndResetVideo() {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
      this.videoPlayer.nativeElement.src = '';
      this.videoPlayer.nativeElement.load();
    }
  }
}
