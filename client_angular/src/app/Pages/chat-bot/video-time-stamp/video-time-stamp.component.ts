import type { HttpClient } from '@angular/common/http';
import type { ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-video-time-stamp',
  templateUrl: './video-time-stamp.component.html',
  styleUrls: ['./video-time-stamp.component.scss'],
})
export class VideoTimeStampComponent implements OnInit, OnDestroy {
  videoUrl: string = '';
  videoLoading: boolean = false;
  startTime: number = 0;
  title: string = '';
  private lastLoggedTime: number = 0;
  private readonly logIntervalSeconds: number = 5;
  private readonly apiUrl = `${environment.server}/event-log`;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { href: string },
    private readonly httpClient: HttpClient,
  ) {}

  ngOnInit(): void {
    const params = this.parseHref(this.data.href);
    const fileName = params['fileName'];
    const timeStamp = params['timeStamp'];
    this.title = `Video: ${fileName} - Start: ${timeStamp.substring(0, 8)}`;

    if (fileName) {
      this.videoFromName(fileName);
    }
    if (timeStamp) {
      this.startTime = this.parseTimeStamp(timeStamp);
    }
  }

  /**
   * Parses the provided href string to extract query parameters.
   * @param href The full URL string from which to extract query parameters.
   * @returns An object containing the query parameters as key-value pairs.
   */
  private parseHref(href: string): Record<string, string> {
    const query = href.split('?')[1];
    return query.split('&').reduce(
      (params, param) => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
        return params;
      },
      {} as Record<string, string>,
    );
  }

  /**
   * Converts a timestamp string into seconds.
   * @param timeStamp The timestamp string in the format "HH:MM:SS,SSS".
   * @returns The time in seconds.
   */
  private parseTimeStamp(timeStamp: string): number {
    const [hours, minutes, seconds] = timeStamp.split(',')[0].split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Sets the videoUrl for video playback based on the provided name.
   * @param name The name of the video file.
   */
  private videoFromName(name: string): void {
    this.videoLoading = true;
    this.videoUrl = `${environment.server}/files/download/VideoByName/${name}.mp4`;
  }

  /**
   * Logs video player events to a backend service.
   * @param action The action performed (e.g., "play", "pause").
   * @param currentTime The current playback time in seconds (optional).
   */
  logEvent(action: string, currentTime?: number): void {
    const message =
      currentTime !== undefined
        ? `${action} video: ${this.title} at ${currentTime.toFixed(2)} seconds`
        : `${action} video: ${this.title}`;
    const logData = {
      level: 'info',
      type: 'chatbot/videoplayer',
      message,
      data: {
        name: this.title,
        action,
        time: currentTime?.toFixed(2),
        videoUrl: this.videoUrl,
        timestamp: new Date().toISOString(),
      },
    };

    this.httpClient.post(this.apiUrl, logData).subscribe({
      error: error => console.error('Error logging video event:', error),
    });
  }

  /**
   * Tracks video progress and logs watching events at defined intervals.
   * @param event The video playback event containing the current time.
   */
  trackVideoProgress(event: any): void {
    const currentTime = event.target.currentTime;
    const timeSinceLastLog = currentTime - this.lastLoggedTime;

    // log every 2 seconds
    if (timeSinceLastLog >= this.logIntervalSeconds || Math.abs(timeSinceLastLog) > 2) {
      this.logEvent('watching', currentTime);
      this.lastLoggedTime = currentTime;
    }
  }

  // preventing Premature close conncetion error by closing the modal while video is loading
  ngOnDestroy() {
    this.stopAndResetVideo();
  }

  private stopAndResetVideo() {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
      this.videoPlayer.nativeElement.src = '';
      this.videoPlayer.nativeElement.load();
    }
    this.videoUrl = '';
  }
}
