import { OnDestroy, OnInit, Component, Input } from '@angular/core';
import { UserService } from 'src/app/Services/auth/user.service';
import { HighlightConceptsService } from 'src/app/Services/highlight-concepts/highlight-concepts.service';
import { HighlightConceptDto, UpdateHighlightConceptDto, ConceptGraphDTO } from '@DTOs/index';
import { CreateHighlightConceptDto } from '@DTOs/index';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HighlightConceptDialogComponent } from './highlight-concept-dialog/highlight-concept-dialog.component';
import { ConceptSelectionService } from 'src/app/Services/concept-selection/concept-selection.service';
import { Router } from '@angular/router';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';

@Component({
  selector: 'app-highlight-navigator',
  templateUrl: './highlight-navigator.component.html',
  styleUrl: './highlight-navigator.component.scss',
})
export class HighlightNavigatorComponent implements OnInit, OnDestroy {
  @Input() moduleId: number = 1; // Default to 1, should be provided by parent component

  highlightConcepts: HighlightConceptDto[] = [];
  isEditMode: boolean = false;
  isLoading: boolean = false;
  hoveredTileId: number | null = null;

  userGraphData: ConceptGraphDTO = {
    id: -1,
    name: 'Loading...',
    trueRootId: -1,
    nodeMap: {},
    edgeMap: {},
    currentConceptId: -1,
  };

  private readonly subscriptions: Subscription = new Subscription();

  constructor(
    private readonly userService: UserService,
    private readonly highlightConceptsService: HighlightConceptsService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly conceptSelectionService: ConceptSelectionService,
    private readonly router: Router,
    private readonly graphDataService: GraphDataService,
  ) {
    this.graphCommunicationService = GraphCommunicationService.getInstance();
  }

  private readonly graphCommunicationService: GraphCommunicationService;

  ngOnInit(): void {
    // Subscribe to edit mode changes
    if (this.userService.getRole() === 'ADMIN') {
      this.subscriptions.add(
        this.userService.hasEditModeActive$.subscribe(isActive => {
          this.isEditMode = isActive;
        }),
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
      this.highlightConceptsService
        .getHighlightConcepts(this.moduleId)
        .pipe(
          catchError(error => {
            this.showMessage('Error loading highlight concepts');
            console.error('Error loading highlight concepts:', error);
            return of([]);
          }),
          finalize(() => {
            this.isLoading = false;
          }),
        )
        .subscribe(concepts => {
          this.highlightConcepts = concepts;
          // Sort concepts by position
          this.sortHighlightConcepts();
        }),
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
    this.highlightConceptsService
      .deleteHighlightConcept(id)
      .pipe(
        catchError(error => {
          this.showMessage('Error deleting highlight concept');
          console.error('Error deleting highlight concept:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
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
        moduleId: this.moduleId,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.highlightConceptsService
          .createHighlightConcept(result)
          .pipe(
            catchError(error => {
              this.showMessage('Error creating highlight concept');
              console.error('Error creating highlight concept:', error);
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            }),
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
        concept: concept,
      },
    });

    dialogRef.afterClosed().subscribe((result: UpdateHighlightConceptDto) => {
      if (result) {
        this.isLoading = true;
        this.highlightConceptsService
          .updateHighlightConcept(concept.id, result)
          .pipe(
            catchError(error => {
              this.showMessage('Error updating highlight concept');
              console.error('Error updating highlight concept:', error);
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            }),
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
      verticalPosition: 'top',
    });
  }

  /**
   * Navigates to the concept when a highlight tile is clicked
   * @param concept The highlight concept to navigate to
   */
  navigateToConcept(concept: HighlightConceptDto, event?: Event): void {
    console.log('navigateToConcept called with concept:', concept);

    if (event) {
      // Prevent event bubbling
      event.stopPropagation();
    }

    // Don't navigate if in edit mode and the user clicked on the edit/delete buttons
    if (this.isEditMode && this.hoveredTileId === concept.id) {
      console.log('Not navigating because in edit mode and hovering over the concept');
      return;
    }

    // Don't navigate if the concept is locked
    if (!concept.isUnlocked) {
      console.log('Not navigating because the concept is locked');
      this.showMessage('This concept is locked and cannot be accessed yet');
      return;
    }

    if (!concept.conceptNodeId) {
      console.error('Cannot navigate: concept.conceptNodeId is undefined or null', concept);
      this.showMessage('This highlight concept is not linked to a concept node');
      return;
    }

    const conceptNodeId = concept.conceptNodeId;
    console.log(`Attempting to navigate to concept node ID: ${conceptNodeId}`);

    // First, fetch the content for the concept to ensure it's loaded
    this.graphDataService.fetchUserGraph(this.moduleId).subscribe({
      next: graph => {
        if (graph.nodeMap && graph.nodeMap[conceptNodeId]) {
          const conceptNode = graph.nodeMap[conceptNodeId];

          // Update the active node in the graph communication service
          this.graphCommunicationService.changeActiveNode(conceptNode);

          // Update the selected concept in the backend
          this.graphDataService.updateSelectedConcept(conceptNodeId).subscribe({
            next: () => {
              console.log(`Successfully updated selected concept to ${conceptNodeId} in backend.`);

              // Force a refresh by navigating to a different route first
              // This is a workaround for Angular's router not refreshing when navigating to the same route
              const currentUrl = this.router.url;
              const targetUrl = `/dashboard/concept/${conceptNodeId}`;

              // Only use the workaround if we're already on a concept page
              if (currentUrl.includes('/dashboard/concept/')) {
                // Navigate to a dummy route first (with skipLocationChange to avoid changing the URL)
                this.router.navigateByUrl('/dashboard', { skipLocationChange: true }).then(() => {
                  // Then navigate to the target route
                  this.router.navigate(['/dashboard/concept', conceptNodeId]);
                });
              } else {
                // If we're not on a concept page, just navigate directly
                this.router.navigate(['/dashboard/concept', conceptNodeId]);
              }
            },
            error: err => {
              console.error(
                `Failed to update selected concept to ${conceptNodeId} in backend:`,
                err,
              );
              // Still try to navigate even if the backend update fails
              this.router.navigate(['/dashboard/concept', conceptNodeId]);
            },
          });
        } else {
          console.error(`Concept node ${conceptNodeId} not found in graph`);
          this.showMessage('Concept node not found. Please try again.');
        }
      },
      error: err => {
        console.error('Error fetching graph data:', err);
        this.showMessage('Error loading concept data. Please try again.');
      },
    });
  }
}
