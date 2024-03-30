import { Component, Input, OnInit, Sanitizer, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FileService } from 'src/app/Services/files/files.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-videoViewer',
  templateUrl: './videoViewer.component.html',
  styleUrls: ['./videoViewer.component.scss']
})
export class VideoViewerComponent implements OnInit {
    /**
   * A unique identifier (from FileDTO) for the video file to be displayed.
   * This is an input property and should be passed from the parent component.
   */
  @Input() uniqueIdentifier: String  = "";

  /**
   * Holds the sanitized URL of the video file.
   * This property is used for securely binding the video URL in the component's template.
   */
  videoUrl: SafeUrl = '';

  constructor(private sanitizer: DomSanitizer, private fileService: FileService) { }

  ngOnInit(): void {
    this.videoFromUniqueIdentifier(this.uniqueIdentifier)

  }

  /**
   * Fetches and prepares the video for display based on a unique identifier.
   *
   * @param uniqueIdentifier A unique string identifier for fetching the video.
   */
  videoFromUniqueIdentifier(uniqueIdentifier: String){
    console.log("Fetching video URL for: " + uniqueIdentifier);
    // Hier verwenden wir eine fiktive URL-Struktur, die du entsprechend deiner API anpassen musst.
    const videoUrl = `${environment.server}/files/download/Video/${uniqueIdentifier}`;
    // Verwende DomSanitizer, um die URL sicher im Template zu binden
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl);
  }

}
