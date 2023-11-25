import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-video-time-stamp',
  templateUrl: './video-time-stamp.component.html',
  styleUrls: ['./video-time-stamp.component.scss'],
})
export class VideoTimeStampComponent implements OnInit {
  videoUrl: string = '';
  startTime: number = 0;
  titel: string = '';
  private readonly apiUrl = environment.server;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { href: string }) {}

  ngOnInit(): void {
    const params = this.parseHref(this.data.href);
    const fileName = params['fileName'];
    const timeStamp = params['timeStamp'];
    this.titel = 'Video: ' + fileName + '   -   Beginn: ' + timeStamp;

    if (fileName) {
      this.videoFromName(fileName);
    }

    if (timeStamp) {
      this.startTime = this.parseTimeStamp(timeStamp);
    }
  }

  parseHref(href: string): Record<string, string> {
    const query = href.split('?')[1];
    return query.split('&').reduce((params, param) => {
      const [key, value] = param.split('=');
      params[key] = decodeURIComponent(value);
      return params;
    }, {} as Record<string, string>);
  }

  parseTimeStamp(timeStamp: string): number {
    const timeParts = timeStamp.split(',');
    const [hours, minutes, seconds] = timeParts[0].split(':').map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  videoFromName(name: string): void {
    this.videoUrl = `${this.apiUrl}/video/RN1/${name}`;
  }
}
