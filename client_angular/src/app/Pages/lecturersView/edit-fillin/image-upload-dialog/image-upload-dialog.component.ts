import { Component, Inject } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-image-upload-dialog',
  templateUrl: './image-upload-dialog.component.html',
  styleUrls: ['./image-upload-dialog.component.scss'],
})
export class ImageUploadDialogComponent {
  activeTab: 'general' | 'upload' = 'upload';
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  altDescription: string = '';
  imageWidth: string = '';
  imageHeight: string = '';

  constructor(
    public dialogRef: MatDialogRef<ImageUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  /**
   * Handles file selection
   * @param {any} event The file input change event
   */
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.createImagePreview(file);
    }
  }

  /**
   * Handles file drop
   * @param {DragEvent} event The drag and drop event
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.selectedFile = file;
      this.createImagePreview(file);
    }
  }

  /**
   * Creates a preview of the selected image
   * @param file The selected image file
   */
  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreviewUrl = e.target.result;
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        this.imageWidth = img.width.toString();
        this.imageHeight = img.height.toString();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Prevents default behavior for drag over event
   * @param {DragEvent} event The drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Closes the dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Saves the selected image and closes the dialog
   */
  onSave(): void {
    if (this.selectedFile && this.imagePreviewUrl) {
      this.dialogRef.close({
        file: this.selectedFile,
        url: this.imagePreviewUrl,
        altDescription: this.altDescription,
        width: this.imageWidth,
        height: this.imageHeight,
      });
    } else {
      this.dialogRef.close();
    }
  }

  /**
   * Switches between tabs
   * @param tab The tab to switch to
   */
  switchTab(tab: 'general' | 'upload'): void {
    this.activeTab = tab;
  }

  /**
   * Checks whether the dialog can be saved
   * @returns Whether the dialog can be saved
   */
  canSave(): boolean {
    return this.selectedFile !== null;
  }
}
