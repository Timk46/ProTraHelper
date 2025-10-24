import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject } from 'rxjs';
import { catchError, filter, switchMap, takeUntil, finalize } from 'rxjs/operators';
import { ConceptNode } from '@DTOs/index';
import { ContentService } from 'src/app/Services/content/content.service';
import { LoggerService } from 'src/app/Services/logger/logger.service';
import { RhinoFileUploadDialogComponent } from './rhino-file-upload-dialog/rhino-file-upload-dialog.component';
import { RhinoFileDialogData, RhinoFileDialogResult } from './rhino-file-dialog.interface';
import { ConfirmationBoxComponent } from '../../../confirmation-box/confirmation-box.component';

/**
 * Management component for assigning Rhino/Grasshopper files to ConceptNodes
 *
 * Allows instructors to upload, replace, and delete .gh files for CAD integration
 */
@Component({
  selector: 'app-concept-rhino-files',
  templateUrl: './concept-rhino-files.component.html',
  styleUrls: ['./concept-rhino-files.component.scss'],
})
export class ConceptRhinoFilesComponent implements OnInit, OnDestroy {
  conceptNodes$!: Observable<ConceptNode[]>;
  loadError = false;
  isProcessing = false;
  displayedColumns: string[] = ['name', 'file', 'actions'];

  private readonly log = this.logger.scope('ConceptRhinoFilesComponent');
  private destroy$ = new Subject<void>();

  constructor(
    private contentService: ContentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private logger: LoggerService,
  ) {}

  ngOnInit(): void {
    this.loadConceptNodes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all ConceptNodes with rhinoFile relations
   */
  loadConceptNodes(): void {
    this.loadError = false;
    this.conceptNodes$ = this.contentService.getConcepts().pipe(
      catchError((error) => {
        this.log.error('Failed to load concept nodes', { error });
        this.loadError = true;
        this.snackBar.open('Fehler beim Laden der Konzepte', 'OK', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        return of([]);
      }),
    );
  }

  /**
   * Opens dialog for uploading or replacing Rhino file
   *
   * The dialog handles file selection, validation, and upload.
   * After successful upload, assigns the file to the ConceptNode.
   */
  openUploadDialog(conceptNode: ConceptNode): void {
    const dialogRef = this.dialog.open<
      RhinoFileUploadDialogComponent,
      RhinoFileDialogData,
      RhinoFileDialogResult
    >(RhinoFileUploadDialogComponent, {
      width: '600px',
      data: { conceptNode },
      disableClose: true, // Prevent accidental close during upload
    });

    dialogRef
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        filter((result) => !!result?.fileId), // Only proceed if file was uploaded
        switchMap((result) =>
          this.contentService.updateConcept(conceptNode.id, {
            rhinoFileId: result!.fileId,
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.log.info('Rhino file assigned', {
            conceptNodeId: conceptNode.id,
          });
          this.snackBar.open('Rhino-Datei erfolgreich zugewiesen', 'OK', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.loadConceptNodes(); // Refresh table
        },
        error: (error) => {
          this.log.error('Failed to assign Rhino file', {
            conceptNodeId: conceptNode.id,
            error,
          });
          this.snackBar.open('Fehler beim Zuweisen der Datei', 'OK', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  /**
   * Removes Rhino file assignment from ConceptNode
   * Shows confirmation dialog before deletion
   */
  deleteRhinoFile(conceptNode: ConceptNode): void {
    const dialogRef = this.dialog.open(ConfirmationBoxComponent, {
      width: '400px',
      data: {
        title: 'Rhino-Datei entfernen',
        message: `Möchten Sie die Rhino-Datei für "${conceptNode.name}" wirklich entfernen?`,
        accept: 'Entfernen',
        decline: 'Abbrechen',
        swapButtons: false,
        swapColors: true, // Make "Entfernen" button red (warn color)
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        filter((confirmed) => !!confirmed),
        switchMap(() => {
          this.isProcessing = true;
          return this.contentService.updateConcept(conceptNode.id, { rhinoFileId: null });
        }),
        finalize(() => (this.isProcessing = false)),
      )
      .subscribe({
        next: () => {
          this.log.info('Rhino file removed', {
            conceptNodeId: conceptNode.id,
          });
          this.snackBar.open('Rhino-Datei entfernt', 'OK', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.loadConceptNodes();
        },
        error: (error) => {
          this.log.error('Failed to delete Rhino file', {
            conceptNodeId: conceptNode.id,
            error,
          });
          this.snackBar.open('Fehler beim Entfernen der Datei', 'OK', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }
}
