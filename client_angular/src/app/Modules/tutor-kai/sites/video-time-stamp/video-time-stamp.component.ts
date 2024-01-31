import { HttpClient, HttpResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-video-time-stamp',
  templateUrl: './video-time-stamp.component.html',
  styleUrls: ['./video-time-stamp.component.scss'],
})
/**
 * VideoTimeStampComponent is a class that handles the display of a video with a specific timestamp.
 * It uses the MAT_DIALOG_DATA injection token to receive data from the parent component.
 *
 * @example
 * <app-video-time-stamp></app-video-time-stamp>
 *
 * @class VideoTimeStampComponent
 */
export class VideoTimeStampComponent implements OnInit {
  /**
   * The URL of the video to be displayed.
   */
  videoUrl: string = '';

  /**
   * A boolean indicating if the video is currently loading.
   */
  videoLoading: boolean = false;

  /**
   * The start time of the video in seconds.
   */
  startTime: number = 0;

  /**
   * The title of the video.
   */
  titel: string = '';

  /**
   * The base URL of the API.
   */
  private readonly apiUrl = environment.server;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { href: string },
    private httpClient: HttpClient
    ) {}

    ngOnInit(): void {
      const params = this.parseHref(this.data.href);
      const fileName = params['fileName'];
      const timeStamp = params['timeStamp'];
      this.titel = 'Video: ' + fileName + '   -   Beginn: ' + timeStamp.substring(0, 8);

      if (fileName) {
        this.videoFromName(fileName);
      }

      if (timeStamp) {
        this.startTime = this.parseTimeStamp(timeStamp);
      }
    }

    /**
     * Parses the href attribute of a link and returns an object with the query parameters (filename & timestamp)
     *
     * @param href - The href attribute of a link.
     * @returns An object with the query parameters.
     */
    parseHref(href: string): Record<string, string> {
      const query = href.split('?')[1];
      return query.split('&').reduce((params, param) => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
        return params;
      }, {} as Record<string, string>);
    }

    /**
     * Parses a timestamp string and returns the time in seconds.
     *
     * @param timeStamp - A timestamp string in the format 'hh:mm:ss'.
     * @returns The time in seconds.
     */
    parseTimeStamp(timeStamp: string): number {
      const timeParts = timeStamp.split(',');
      const [hours, minutes, seconds] = timeParts[0].split(':').map(Number);

      return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Sets the URL of the video to be displayed based on the file name and lecture.
     *
     * @param name - The name of the video file.
     * @param lecture - The lecture the video is associated with.
     */
    videoFromName(name: string): void {
      this.videoLoading = true;
      this.videoUrl = `https://api-lecturelinker.bshefl0.bs.informatik.uni-siegen.de/video/OFP/${name}.mp4`;
    }
  }
