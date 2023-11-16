import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileService } from '../../../Services/files/files.service';

@Component({
  selector: 'app-video-time-stamp',
  templateUrl: './video-time-stamp.component.html',
  styleUrls: ['./video-time-stamp.component.scss'],
})
export class VideoTimeStampComponent implements OnInit {
  videoUrl: string = '';
  startTime: number = 0;
  titel: string = '';

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService
  ) {}

  /**
   * Initializes the component by subscribing to route query parameters and setting the video file and start time.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const fileName = params['fileName'];
      const timeStamp = params['timeStamp'];
      this.titel = 'Video: ' + fileName + ' - Link zu Stelle: ' + timeStamp;

      if (fileName) {
        this.videoFromName(fileName);
      }

      if (timeStamp) {
        this.startTime = this.parseTimeStamp(timeStamp);
      }
    });
  }

  /**
   * Parses the provided timestamp (Format: hh:mm:ss,000) string and returns the total number of seconds.
   */
  parseTimeStamp(timeStamp: string): number {
    const timeParts = timeStamp.split(',');
    const [hours, minutes, seconds] = timeParts[0].split(':').map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Retrieves the video file by name and sets the video URL for playback.
   */
  videoFromName(name: string): void {
    this.fileService.downloadFileByName(name).subscribe((response) => {
      const blob = response.body;

      if (blob !== null) {
        const url = URL.createObjectURL(blob);
        this.videoUrl = url;
      } else {
        console.error('no video found');
      }
    });
  }
}
