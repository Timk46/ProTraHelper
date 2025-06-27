import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TaskViewData, uploadQuestionDTO } from '@DTOs/question.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-upload-task',
  templateUrl: './upload-task.component.html',
  styleUrl: './upload-task.component.scss'
})
export class UploadTaskComponent {

  @Output() submitClicked = new EventEmitter<any>();
  uploadQuestion: uploadQuestionDTO | undefined;
  taskViewData: TaskViewData;

  // File upload properties
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;




  constructor(
    public dialogRef: MatDialogRef<UploadTaskComponent>,
    private questionService: QuestionDataService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.taskViewData = data.taskViewData;
    this.questionService.getUploadQuestion(this.taskViewData.id).subscribe(data => {
      console.log('Upload question data:', data);
      this.uploadQuestion = data;
      this.uploadQuestion.contentElementId = this.taskViewData.contentElementId;
    });
    // Initialization logic can go here if needed
  }

  // File handling methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const success = this.handleFile(file);
      if (!success) {
        // Reset file input if validation failed
        event.target.value = '';
      }
    }
  }

  private handleFile(file: File): boolean {
    // Check file type
    if (this.uploadQuestion?.fileType && !file.type.includes(this.uploadQuestion.fileType.replace('*', ''))) {
      this.snackBar.open(`Nur Dateien vom Typ ${this.uploadQuestion.fileType} sind erlaubt.`, 'OK', {
        duration: 3000,
      });
      this.selectedFile = null; // Reset selected file
      return false;
    }

    // Check file size
    if (this.uploadQuestion?.maxSize && file.size > this.uploadQuestion.maxSize) {
      this.snackBar.open(`Die Datei ist zu groß. Maximale Größe: ${this.formatFileSize(this.uploadQuestion.maxSize)}`, 'OK', {
        duration: 3000,
      });
      this.selectedFile = null; // Reset selected file
      return false;
    }

    this.selectedFile = file;
    return true;
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
    this.isDragOver = false; // Reset drag state
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;

    // Simulate upload - replace with actual upload service
    setTimeout(() => {
      this.isUploading = false;
      this.submitClicked.emit({
        file: this.selectedFile,
        questionId: this.uploadQuestion?.questionId
      });
      this.dialogRef.close({
        uploaded: true,
        file: this.selectedFile
      });
    }, 2000);
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileType: string): string {
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('pdf')) return 'picture_as_pdf';
    if (fileType.includes('video')) return 'videocam';
    if (fileType.includes('audio')) return 'audiotrack';
    if (fileType.includes('text')) return 'description';
    return 'insert_drive_file';
  }

  getFileIconClass(fileType: string): string {
    if (fileType.includes('image')) return 'file-icon-image';
    if (fileType.includes('pdf')) return 'file-icon-pdf';
    if (fileType.includes('video')) return 'file-icon-video';
    if (fileType.includes('audio')) return 'file-icon-audio';
    if (fileType.includes('text')) return 'file-icon-text';
    return 'file-icon-default';
  }

}
