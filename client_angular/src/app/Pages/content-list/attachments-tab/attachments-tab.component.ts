import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { ContentElementDTO, contentElementType, filePrivacy } from '@DTOs/index';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { FileService } from 'src/app/Services/files/files.service';

@Component({
  selector: 'app-attachments-tab',
  templateUrl: './attachments-tab.component.html',
  styleUrls: ['./attachments-tab.component.scss'],
})
export class AttachmentsTabComponent implements OnInit {
  @Input() contentNodeId!: number;
  @Input() allContentElements: ContentElementDTO[] = [];

  attachments: ContentElementDTO[] = [];
  unlinkedAttachments: ContentElementDTO[] = [];
  selectedUnlinkedAttachment: number | null = null;

  constructor(
    private readonly contentLinkerService: ContentLinkerService,
    private readonly fileService: FileService,
  ) {}

  ngOnInit(): void {
    this.loadAttachments();
    this.loadUnlinkedAttachments();
  }

  loadAttachments(): void {
    if (this.contentNodeId) {
      this.attachments = this.allContentElements
        .filter(el => el.type !== 'QUESTION')
        .sort((a, b) => a.positionInSpecificContentView - b.positionInSpecificContentView);
    }
  }

  loadUnlinkedAttachments(): void {
    this.contentLinkerService.getUnlinkedAttachments().subscribe(attachments => {
      this.unlinkedAttachments = attachments;
    });
  }

  drop(event: CdkDragDrop<ContentElementDTO[]>): void {
    moveItemInArray(this.attachments, event.previousIndex, event.currentIndex);
    this.updatePositions();
  }

  updatePositions(): void {
    const questionElementIds = this.allContentElements
      .filter(el => el.type === 'QUESTION')
      .sort((a, b) => a.positionInSpecificContentView - b.positionInSpecificContentView)
      .map(el => el.id);

    const attachmentIds = this.attachments.map(el => el.id);

    const orderedElementIds = [...questionElementIds, ...attachmentIds];

    this.contentLinkerService
      .updateContentElementPositions(this.contentNodeId, orderedElementIds)
      .subscribe(() => {
        // Optionally refresh data or show a notification
      });
  }

  deleteAttachment(attachmentId: number): void {
    this.contentLinkerService
      .unlinkContentAttachment(this.contentNodeId, attachmentId)
      .subscribe(() => {
        this.attachments = this.attachments.filter(att => att.id !== attachmentId);
        this.loadUnlinkedAttachments(); // Refresh unlinked attachments
      });
  }

  addExistingAttachment(): void {
    if (this.selectedUnlinkedAttachment) {
      this.contentLinkerService
        .linkContentAttachment(this.contentNodeId, this.selectedUnlinkedAttachment)
        .subscribe(() => {
          this.refreshAll();
        });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileService.uploadFile(file).subscribe(response => {
        // Validate response has fileId
        if (!response.id) {
          console.error('Upload response missing file ID', response);
          return;
        }

        const fileId = response.id;

        let fileType: contentElementType;
        if (file.type.includes('pdf')) {
          fileType = contentElementType.PDF;
        } else if (file.name.toLowerCase().endsWith('.gh')) {
          fileType = contentElementType.RHINO;
        } else {
          fileType = contentElementType.VIDEO;
        }

        const newAttachment: ContentElementDTO = {
          id: 0, // Will be set by backend
          title: file.name,
          type: fileType,
          positionInSpecificContentView: 0, // Will be set by backend
        };

        this.contentLinkerService
          .createContentAttachment(this.contentNodeId, fileId, newAttachment)
          .subscribe(() => {
            this.refreshAll();
          });
      });
    }
  }

  private refreshAll(): void {
    // This is a bit inefficient, ideally the services would return the new/updated element
    this.contentLinkerService.getContentAttachments(this.contentNodeId).subscribe(attachments => {
      this.attachments = attachments.sort(
        (a, b) => a.positionInSpecificContentView - b.positionInSpecificContentView,
      );
      this.loadUnlinkedAttachments();
      this.selectedUnlinkedAttachment = null;
    });
  }
}
