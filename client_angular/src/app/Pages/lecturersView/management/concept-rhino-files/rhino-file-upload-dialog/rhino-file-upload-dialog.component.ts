import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileService } from 'src/app/Services/files/files.service';
import { LoggerService } from 'src/app/Services/logger/logger.service';
import { FileDto } from '@DTOs/index';
import {
  RhinoFileDialogData,
  RhinoFileDialogResult,
} from '../rhino-file-dialog.interface';

/**
 * Dialog component for uploading Rhino/Grasshopper (.gh) files
 *
 * Features:
 * - Drag-and-drop file selection
 * - File validation (.gh extension, size limit)
 * - Upload progress feedback
 * - Error handling with user feedback
 */
@Component({
  selector: 'app-rhino-file-upload-dialog',
  templateUrl: './rhino-file-upload-dialog.component.html',
  styleUrls: ['./rhino-file-upload-dialog.component.scss'],
})
export class RhinoFileUploadDialogComponent {
  selectedFile: File | null = null;
  dragOver = false;
  isUploading = false;

  private readonly MAX_FILE_SIZE_MB = 50;
  private readonly log = this.logger.scope('RhinoFileUploadDialogComponent');

  constructor(
    private dialogRef: MatDialogRef<RhinoFileUploadDialogComponent, RhinoFileDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: RhinoFileDialogData,
    private snackBar: MatSnackBar,
    private fileService: FileService,
    private logger: LoggerService,
  ) {}

  /**
   * Handles file selection from input element
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.validateAndSetFile(input.files[0]);
    }
  }

  /**
   * Handles file drop from drag-and-drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    if (event.dataTransfer?.files.length) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  /**
   * Prevents default drag over behavior
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  /**
   * Validates file extension and size before setting as selected file.
   * Shows user feedback via SnackBar for validation errors.
   *
   * Validation rules:
   * - Extension must be .gh (Grasshopper file format)
   * - Size must not exceed MAX_FILE_SIZE_MB (50MB)
   *
   * @param file - The file to validate and potentially set as selectedFile
   * @private
   */
  private validateAndSetFile(file: File): void {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.gh')) {
      this.snackBar.open('Nur Grasshopper-Dateien (.gh) sind erlaubt', 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      this.snackBar.open(`Datei zu groß (max. ${this.MAX_FILE_SIZE_MB}MB)`, 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.selectedFile = file;
  }

  /**
   * Uploads file to server and closes dialog with file metadata
   * Provides upload progress feedback and error handling
   */
  onUpload(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.fileService.uploadFile(this.selectedFile).subscribe({
      next: (uploadResponse: FileDto) => {
        if (!uploadResponse.id) {
          this.log.error('Upload response missing file ID', { uploadResponse });
          this.snackBar.open('Upload fehlgeschlagen: Keine Datei-ID erhalten', 'OK', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUploading = false;
          return;
        }

        this.dialogRef.close({
          fileId: uploadResponse.id,
          fileName: uploadResponse.name,
        });
      },
      error: (error) => {
        this.log.error('File upload failed', {
          error,
          fileName: this.selectedFile?.name,
          fileSize: this.selectedFile?.size,
          conceptNodeId: this.data.conceptNode.id,
        });
        this.isUploading = false;
        this.snackBar.open('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.', 'OK', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Closes dialog without uploading
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}
