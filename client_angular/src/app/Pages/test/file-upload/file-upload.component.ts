// This Component is just a test component to test the file upload and download functionality.
import { Component } from '@angular/core';
import { FileService } from '../../../Services/files/files.service';
@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
})
export class FileUploadComponent {
  fileToUpload: File | null = null;
  uniqueIdentifier: string = '';

  constructor(private fileService: FileService) {}

  /**
   * Called when a file is selected via the UI.
   *
   * @param event The event object containing information about the selected file.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input?.files?.length) {
      this.fileToUpload = input.files[0];
    }
  }

  /**
   * Uploads the selected file via the FileService.
   */
  uploadFile(): void {
    if (this.fileToUpload) {
      this.fileService.uploadFile(this.fileToUpload).subscribe((response) => {
        console.log(response);
        // Handle the response as needed.
      });
    }
  }

  /**
   * Downloads a file via its unique identifier.
   *
   * This method makes use of the FileService to fetch the file and its metadata and initiates a browser download.
   */
  downloadFile(): void {
    if (this.uniqueIdentifier) {
      this.fileService
        .downloadFile(this.uniqueIdentifier)
        .subscribe((response) => {
          const blobData = response.body;
          console.log(JSON.stringify(response.headers));
          if (blobData !== null) {
            const blob = new Blob([blobData], {
              type: 'application/octet-stream',
            });
            const fileName =
              response.headers.get('X-Filename') || 'error_no_file_name.txt';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            console.error('Download fehlgeschlagen: Blob-Daten sind null');
          }
        });
    }
  }
}
