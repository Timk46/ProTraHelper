import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UserService } from 'src/app/Services/auth/user.service';
import { HighlightConceptsService } from 'src/app/Services/highlight-concepts/highlight-concepts.service';
import { HighlightConceptDto, CreateHighlightConceptDto, UpdateHighlightConceptDto } from '@DTOs/index';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HighlightConceptDialogComponent } from './highlight-concept-dialog/highlight-concept-dialog.component';
import { ConceptSelectionService } from 'src/app/Services/concept-selection/concept-selection.service';

@Component({
  selector: 'app-highlight-navigator',
  templateUrl: './highlight-navigator.component.html',
  styleUrl: './highlight-navigator.component.scss'
})
export class HighlightNavigatorComponent implements OnInit, OnDestroy {
  @Input() moduleId: number = 1; // Default to 1, should be provided by parent component

  highlightConcepts: HighlightConceptDto[] = [];
  isEditMode: boolean = false;
  isLoading: boolean = false;
  hoveredTileId: number | null = null;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private userService: UserService,
    private highlightConceptsService: HighlightConceptsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private conceptSelectionService: ConceptSelectionService
  ){}

  ngOnInit(): void {
    // Subscribe to edit mode changes
    if (this.userService.getRole() === 'ADMIN') {
      this.subscriptions.add(
        this.userService.hasEditModeActive$.subscribe(isActive => {
          this.isEditMode = isActive;
        })
      );
    }

    // Load highlight concepts
    this.loadHighlightConcepts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Loads highlight concepts for the current module
   */
  loadHighlightConcepts(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.highlightConceptsService.getHighlightConcepts(this.moduleId)
        .pipe(
          catchError(error => {
            this.showMessage('Error loading highlight concepts');
            console.error('Error loading highlight concepts:', error);
            return of([]);
          }),
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe(concepts => {
          this.highlightConcepts = concepts;
          // Sort concepts by position
          this.sortHighlightConcepts();
        })
    );
  }

  /**
   * Sorts highlight concepts by position
   * Concepts with undefined position will be placed at the end
   */
  private sortHighlightConcepts(): void {
    this.highlightConcepts.sort((a, b) => {
      // If position is undefined, set it to a high value (display at the end)
      const posA = a.position !== undefined ? a.position : Number.MAX_SAFE_INTEGER;
      const posB = b.position !== undefined ? b.position : Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
  }

  /**
   * Sets the hovered tile ID for hover effects
   */
  setHoveredTile(id: number | null): void {
    this.hoveredTileId = id;
  }

  /**
   * Checks if the current user can modify highlight concepts
   */
  canModify(): boolean {
    return this.userService.getRole() === 'ADMIN' && this.isEditMode;
  }

  /**
   * Deletes a highlight concept
   */
  deleteConcept(id: number, event: Event): void {
    event.stopPropagation(); // Prevent triggering other click events

    if (!this.canModify()) {
      return;
    }

    this.isLoading = true;
    this.highlightConceptsService.deleteHighlightConcept(id)
      .pipe(
        catchError(error => {
          this.showMessage('Error deleting highlight concept');
          console.error('Error deleting highlight concept:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(() => {
        this.highlightConcepts = this.highlightConcepts.filter(concept => concept.id !== id);
        this.showMessage('Highlight concept deleted');
      });
  }

  /**
   * Opens a dialog to create a new highlight concept
   */
  addNewConcept(): void {
    if (!this.canModify()) {
      return;
    }

    // Clear any previously selected concept
    this.conceptSelectionService.clearSelectedConceptId();

    const dialogRef = this.dialog.open(HighlightConceptDialogComponent, {
      width: '800px',
      data: {
        moduleId: this.moduleId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.highlightConceptsService.createHighlightConcept(result)
          .pipe(
            catchError(error => {
              this.showMessage('Error creating highlight concept');
              console.error('Error creating highlight concept:', error);
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          )
          .subscribe(concept => {
            if (concept) {
              this.highlightConcepts.push(concept);
              // Sort concepts after adding a new one
              this.sortHighlightConcepts();
              this.showMessage('New highlight concept added');
            }
          });
      }
    });
  }

  /**
   * Opens a dialog to edit an existing highlight concept
   */
  editConcept(concept: HighlightConceptDto, event: Event): void {
    event.stopPropagation(); // Prevent triggering other click events

    if (!this.canModify()) {
      return;
    }

    // Set the selected concept ID
    this.conceptSelectionService.setSelectedConceptId(concept.conceptNodeId);

    const dialogRef = this.dialog.open(HighlightConceptDialogComponent, {
      width: '800px',
      data: {
        moduleId: this.moduleId,
        concept: concept
      }
    });

    dialogRef.afterClosed().subscribe((result: UpdateHighlightConceptDto) => {
      if (result) {
        this.isLoading = true;
        this.highlightConceptsService.updateHighlightConcept(concept.id, result)
          .pipe(
            catchError(error => {
              this.showMessage('Error updating highlight concept');
              console.error('Error updating highlight concept:', error);
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          )
          .subscribe(updatedConcept => {
            if (updatedConcept) {
              // Update the concept in the array
              const index = this.highlightConcepts.findIndex(c => c.id === updatedConcept.id);
              if (index !== -1) {
                this.highlightConcepts[index] = updatedConcept;
                // Sort concepts after updating one
                this.sortHighlightConcepts();
              }
              this.showMessage('Highlight concept updated');
            }
          });
      }
    });
  }

  /**
   * Shows a snackbar message
   */
  private showMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}
